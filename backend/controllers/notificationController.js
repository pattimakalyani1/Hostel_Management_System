const prisma = require('../utils/prisma');

/**
 * Get the authenticated user's notifications (newest first).
 * Users can ONLY ever see their own notifications (scoped by req.user.userId).
 * GET /api/notifications
 */
const getMyNotifications = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 100);

    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.userId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false }
    });

    res.json({ notifications, unreadCount });
  } catch (error) {
    console.error('Get notifications error:', error);
    next(error);
  }
};

/**
 * Get just the unread count for the authenticated user (for the bell badge).
 * GET /api/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const unreadCount = await prisma.notification.count({
      where: { userId: req.user.userId, isRead: false }
    });
    res.json({ unreadCount });
  } catch (error) {
    console.error('Get unread count error:', error);
    next(error);
  }
};

/**
 * Mark a single notification as read. Only the owner may do this.
 * PUT /api/notifications/:id/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid notification id.' });
    }

    // Ownership check: only update if it belongs to this user.
    const result = await prisma.notification.updateMany({
      where: { id, userId: req.user.userId },
      data: { isRead: true }
    });

    if (result.count === 0) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    next(error);
  }
};

/**
 * Mark all of the authenticated user's notifications as read.
 * PUT /api/notifications/read-all
 */
const markAllAsRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.userId, isRead: false },
      data: { isRead: true }
    });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all read error:', error);
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead
};
