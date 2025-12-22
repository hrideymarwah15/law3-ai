const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const paymentService = require('../services/payment.service');
const smsService = require('../services/sms.service');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { webhookLimiter } = require('../middleware/rateLimiter');

// Apply webhook rate limiter
router.use(webhookLimiter);

/**
 * POST /webhooks/razorpay
 * Handle Razorpay payment webhooks
 */
router.post('/razorpay', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'];

    if (!signature) {
      logger.warn({ message: 'Razorpay webhook missing signature' });
      return res.status(400).json({ error: 'Missing signature' });
    }

    // Verify webhook signature
    const rawBody = req.body.toString();
    const isValid = paymentService.verifyWebhookSignature(rawBody, signature);

    if (!isValid) {
      logger.warn({ message: 'Razorpay webhook signature verification failed' });
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(rawBody);
    const { event: eventType, payload } = event;

    logger.info({ message: 'Razorpay webhook received', eventType });

    switch (eventType) {
      case 'payment.captured':
        await handlePaymentCaptured(payload.payment.entity);
        break;

      case 'payment.failed':
        await handlePaymentFailed(payload.payment.entity);
        break;

      case 'refund.created':
        await handleRefundCreated(payload.refund.entity);
        break;

      case 'refund.processed':
        await handleRefundProcessed(payload.refund.entity);
        break;

      case 'order.paid':
        await handleOrderPaid(payload.order.entity, payload.payment.entity);
        break;

      default:
        logger.info({ message: 'Unhandled Razorpay webhook event', eventType });
    }

    // Acknowledge receipt
    res.json({ received: true });
  } catch (error) {
    logger.error({ message: 'Razorpay webhook error', error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Handle payment.captured event
 */
async function handlePaymentCaptured(payment) {
  const { order_id, id: payment_id, amount, status, notes } = payment;

  logger.info({ message: 'Payment captured', orderId: order_id, paymentId: payment_id });

  // First find the payment record by order_id to get consultation_id
  const { data: paymentRecord, error: paymentError } = await supabaseAdmin
    .from('payments')
    .select('consultation_id')
    .eq('razorpay_order_id', order_id)
    .single();

  if (paymentError || !paymentRecord) {
    logger.error({ message: 'Payment record not found for order', orderId: order_id });
    return;
  }

  // Now find consultation
  const { data: consultation, error } = await supabaseAdmin
    .from('consultations')
    .select('id, user_id, lawyer_id, booking_date, booking_time')
    .eq('id', paymentRecord.consultation_id)
    .single();

  if (error || !consultation) {
    logger.error({ message: 'Consultation not found for payment', orderId: order_id });
    return;
  }

    // Update payment record first
    await supabaseAdmin
      .from('payments')
      .update({
        razorpay_payment_id: payment_id,
        status: 'success',
        paid_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', order_id);

    // Update consultation
    await supabaseAdmin
      .from('consultations')
      .update({
        payment_status: 'captured',
        is_paid: true,
        paid_at: new Date().toISOString(),
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', consultation.id);

  // Get user details for notification
  const { data: user } = await supabaseAdmin
    .from('users')
    .select('phone, display_name')
    .eq('id', consultation.user_id)
    .single();

  // Get lawyer details
  const { data: lawyer } = await supabaseAdmin
    .from('lawyers')
    .select('users:user_id(display_name)')
    .eq('id', consultation.lawyer_id)
    .single();

  const lawyerName = lawyer?.users?.display_name || 'your lawyer';
  const amountInRupees = amount / 100;

  // Send booking confirmation SMS
  if (user?.phone) {
    try {
      await smsService.sendBookingConfirmation(
        user.phone,
        lawyerName,
        consultation.booking_date,
        consultation.booking_time,
        amountInRupees
      );

      // Send payment receipt SMS
      await smsService.sendPaymentReceipt(
        user.phone,
        amountInRupees,
        consultation.id
      );
    } catch (smsError) {
      logger.error({ message: 'Failed to send booking/receipt SMS', error: smsError.message });
    }
  }

  // Clear cache
  await cache.del(`consultations:user:${consultation.user_id}`);
  await cache.del(`consultations:lawyer:${consultation.lawyer_id}`);
}

/**
 * Handle payment.failed event
 */
async function handlePaymentFailed(payment) {
  const { order_id, id: payment_id, error_code, error_description } = payment;

  logger.warn({
    message: 'Payment failed',
    orderId: order_id,
    paymentId: payment_id,
    errorCode: error_code,
    errorDescription: error_description,
  });

  // Find payment record first to get consultation_id
  const { data: paymentRecord } = await supabaseAdmin
    .from('payments')
    .select('consultation_id')
    .eq('razorpay_order_id', order_id)
    .single();

  if (paymentRecord) {
    // Update payment record
    await supabaseAdmin
      .from('payments')
      .update({
        status: 'failed',
        error_message: error_description,
        razorpay_payment_id: payment_id,
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_order_id', order_id);

    // Get consultation for cache clearing
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('id, user_id, lawyer_id')
      .eq('id', paymentRecord.consultation_id)
      .single();

    if (consultation) {
      await supabaseAdmin
        .from('consultations')
        .update({
          payment_status: 'failed',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation.id);

      // Clear cache
      await cache.del(`consultations:user:${consultation.user_id}`);
      await cache.del(`consultations:lawyer:${consultation.lawyer_id}`);
    }
  }
}

/**
 * Handle refund.created event
 */
async function handleRefundCreated(refund) {
  const { payment_id, id: refund_id, amount, status } = refund;

  logger.info({ message: 'Refund created', paymentId: payment_id, refundId: refund_id });

  // Find payment record by razorpay_payment_id to get consultation_id
  const { data: paymentRecord } = await supabaseAdmin
    .from('payments')
    .select('consultation_id')
    .eq('razorpay_payment_id', payment_id)
    .single();

  if (paymentRecord) {
    // Update payment record with refund info
    await supabaseAdmin
      .from('payments')
      .update({
        refund_id: refund_id,
        refund_status: 'initiated',
        refund_amount: amount / 100, // Convert paise to rupees
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_payment_id', payment_id);

    // Update consultation status
    await supabaseAdmin
      .from('consultations')
      .update({
        payment_status: 'refund_initiated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', paymentRecord.consultation_id);
  }
}

/**
 * Handle refund.processed event
 */
async function handleRefundProcessed(refund) {
  const { payment_id, id: refund_id, amount, status } = refund;

  logger.info({ message: 'Refund processed', paymentId: payment_id, refundId: refund_id });

  // Find payment record to get consultation_id
  const { data: paymentRecord } = await supabaseAdmin
    .from('payments')
    .select('consultation_id')
    .eq('razorpay_payment_id', payment_id)
    .single();

  if (paymentRecord) {
    // Update payment record
    await supabaseAdmin
      .from('payments')
      .update({
        refund_status: 'completed',
        refunded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('razorpay_payment_id', payment_id);

    // Get consultation for user notification
    const { data: consultation } = await supabaseAdmin
      .from('consultations')
      .select('id, user_id')
      .eq('id', paymentRecord.consultation_id)
      .single();

    if (consultation) {
      // Update consultation status
      await supabaseAdmin
        .from('consultations')
        .update({
          payment_status: 'refunded',
          updated_at: new Date().toISOString(),
        })
        .eq('id', consultation.id);

      // Get user for notification
      const { data: user } = await supabaseAdmin
        .from('users')
        .select('phone, display_name')
        .eq('id', consultation.user_id)
        .single();

      // Send refund notification SMS
      if (user?.phone) {
        try {
          await smsService.sendSMS(
            user.phone,
            `Hi ${user.display_name || 'there'}, your refund of ₹${amount / 100} has been processed. It will reflect in your account within 5-7 business days. - Nyaay Saathi`
          );
        } catch (smsError) {
          logger.error({ message: 'Failed to send refund SMS', error: smsError.message });
        }
      }

      // Clear cache
      await cache.del(`consultations:user:${consultation.user_id}`);
    }
  }
}

/**
 * Handle order.paid event
 */
async function handleOrderPaid(order, payment) {
  const { id: order_id, status, amount } = order;

  logger.info({ message: 'Order paid', orderId: order_id, status });

  // This is a backup confirmation - primary handling is in payment.captured
  // Just log for audit purposes
}

/**
 * POST /webhooks/supabase
 * Handle Supabase database webhooks (if configured)
 */
router.post('/supabase', async (req, res) => {
  try {
    const { type, table, record, old_record } = req.body;

    logger.info({ message: 'Supabase webhook received', type, table });

    // Handle different table events
    switch (table) {
      case 'consultations':
        if (type === 'UPDATE' && record.status === 'completed') {
          // Could trigger post-consultation actions
          logger.info({ message: 'Consultation completed', consultationId: record.id });
        }
        break;

      case 'lawyers':
        if (type === 'UPDATE' && record.verification_status === 'verified') {
          // Clear cache and potentially send notification
          await cache.del(`lawyer:profile:${record.user_id}`);
          logger.info({ message: 'Lawyer verified', lawyerId: record.user_id });
        }
        break;

      default:
        logger.debug({ message: 'Unhandled Supabase webhook', type, table });
    }

    res.json({ received: true });
  } catch (error) {
    logger.error({ message: 'Supabase webhook error', error: error.message });
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

module.exports = router;
