const express = require('express');
const router = express.Router();
const reminderController = require('../controllers/reminder.controller');
const { supabaseAuthMiddleware, roleMiddleware } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const {
  createReminder,
  updateReminder,
  getReminderById,
  listReminders,
  upcomingReminders,
} = require('../validators/case.validators');
const { generalLimiter, adminLimiter } = require('../middleware/rateLimiter');

// All reminder routes require authentication
router.use(supabaseAuthMiddleware);
router.use(generalLimiter);

// Create a new reminder
router.post('/create', validate(createReminder), reminderController.create);

// Get all reminders for the logged-in user
router.get('/my-reminders', validate(listReminders), reminderController.getMyReminders);

// Get upcoming reminders
router.get('/upcoming', validate(upcomingReminders), reminderController.getUpcoming);

// Update a reminder
router.put('/:reminder_id', validate(updateReminder), reminderController.update);

// Delete a reminder
router.delete('/:reminder_id', validate(getReminderById), reminderController.delete);

// Admin/Cron routes for processing reminders
router.post(
  '/:reminder_id/mark-sent',
  roleMiddleware('admin'),
  adminLimiter,
  validate(getReminderById),
  reminderController.markAsSent
);

router.post(
  '/process-due',
  roleMiddleware('admin'),
  adminLimiter,
  reminderController.processDueReminders
);

module.exports = router;
