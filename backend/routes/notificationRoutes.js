const express = require('express');
const notificationController = require('../controllers/notificationController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// All notification routes require authentication. They are role-agnostic:
// every user (STUDENT or WARDEN) manages only their OWN notifications,
// scoped by req.user.userId inside the controller.
router.use(authenticate);

// Specific routes before any parameterized ones.
router.get('/', notificationController.getMyNotifications);
router.get('/unread-count', notificationController.getUnreadCount);
router.put('/read-all', notificationController.markAllAsRead);
router.put('/:id/read', notificationController.markAsRead);

module.exports = router;
