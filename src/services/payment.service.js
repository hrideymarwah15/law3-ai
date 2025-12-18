const Razorpay = require('razorpay');
const crypto = require('crypto');
const logger = require('../config/logger');
const { ExternalServiceError } = require('../middleware/errorHandler');

class PaymentService {
  constructor() {
    this.razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  }

  /**
   * Create a Razorpay order
   * @param {number} amount - Amount in paise (INR)
   * @param {string} receipt - Unique receipt ID (usually consultation_id)
   * @param {object} notes - Additional notes
   */
  async createOrder(amount, receipt, notes = {}) {
    try {
      const order = await this.razorpay.orders.create({
        amount: Math.round(amount * 100), // Convert to paise
        currency: 'INR',
        receipt,
        notes: {
          ...notes,
          platform: 'nyaay-saathi',
        },
      });

      logger.info({ 
        message: 'Razorpay order created', 
        orderId: order.id, 
        amount, 
        receipt 
      });

      return {
        order_id: order.id,
        amount: order.amount / 100,
        currency: order.currency,
        receipt: order.receipt,
      };
    } catch (error) {
      logger.error({ message: 'Razorpay order creation failed', error: error.message });
      throw new ExternalServiceError('Failed to create payment order', 'razorpay');
    }
  }

  /**
   * Verify Razorpay payment signature
   * @param {string} orderId - Razorpay order ID
   * @param {string} paymentId - Razorpay payment ID
   * @param {string} signature - Razorpay signature
   */
  verifySignature(orderId, paymentId, signature) {
    const body = orderId + '|' + paymentId;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    const isValid = expectedSignature === signature;

    if (!isValid) {
      logger.warn({ 
        message: 'Invalid Razorpay signature', 
        orderId, 
        paymentId 
      });
    }

    return isValid;
  }

  /**
   * Verify webhook signature
   * @param {string} body - Raw request body
   * @param {string} signature - X-Razorpay-Signature header
   */
  verifyWebhookSignature(body, signature) {
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
      .update(body)
      .digest('hex');

    return expectedSignature === signature;
  }

  /**
   * Fetch payment details
   * @param {string} paymentId - Razorpay payment ID
   */
  async getPayment(paymentId) {
    try {
      return await this.razorpay.payments.fetch(paymentId);
    } catch (error) {
      logger.error({ message: 'Failed to fetch payment', paymentId, error: error.message });
      throw new ExternalServiceError('Failed to fetch payment details', 'razorpay');
    }
  }

  /**
   * Initiate refund
   * @param {string} paymentId - Razorpay payment ID
   * @param {number} amount - Amount to refund (optional, full refund if not provided)
   */
  async initiateRefund(paymentId, amount = null) {
    try {
      const refundData = {};
      if (amount) {
        refundData.amount = Math.round(amount * 100); // Convert to paise
      }

      const refund = await this.razorpay.payments.refund(paymentId, refundData);

      logger.info({ 
        message: 'Refund initiated', 
        paymentId, 
        refundId: refund.id, 
        amount: refund.amount / 100 
      });

      return {
        refund_id: refund.id,
        payment_id: refund.payment_id,
        amount: refund.amount / 100,
        status: refund.status,
      };
    } catch (error) {
      logger.error({ message: 'Refund failed', paymentId, error: error.message });
      throw new ExternalServiceError('Failed to initiate refund', 'razorpay');
    }
  }
}

module.exports = new PaymentService();
