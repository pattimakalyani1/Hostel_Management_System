const prisma = require('../utils/prisma');

/**
 * Centralized notification service.
 *
 * All module actions (rooms, fees, complaints, outpass) create notifications
 * through these helpers so there is a single, reusable notification pipeline.
 *
 * IMPORTANT: notification creation must never break the primary action.
 * Every helper swallows its own errors (logs and continues) so that, for
 * example, a failed notification insert does not roll back an approved
 * outpass or a successful payment.
 */

/**
 * Create a single notification for a specific user (by User.id).
 */
const createNotification = async ({ userId, type = 'GENERAL', title, message, link = null }) => {
  try {
    if (!userId || !title || !message) return null;
    return await prisma.notification.create({
      data: { userId, type, title, message, link }
    });
  } catch (error) {
    console.error('createNotification error (non-fatal):', error.message);
    return null;
  }
};

/**
 * Notify a student by their Student.id. Resolves the underlying User.id.
 */
const notifyStudentById = async ({ studentId, type = 'GENERAL', title, message, link = null }) => {
  try {
    if (!studentId) return null;
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      select: { userId: true }
    });
    if (!student) return null;
    return await createNotification({ userId: student.userId, type, title, message, link });
  } catch (error) {
    console.error('notifyStudentById error (non-fatal):', error.message);
    return null;
  }
};

/**
 * Notify every WARDEN user. There is no separate ADMIN role in this system,
 * so warden-facing events (new complaint, new payment) fan out to all wardens.
 */
const notifyWardens = async ({ type = 'GENERAL', title, message, link = null }) => {
  try {
    const wardens = await prisma.user.findMany({
      where: { role: 'WARDEN', isActive: true },
      select: { id: true }
    });
    if (wardens.length === 0) return;
    await prisma.notification.createMany({
      data: wardens.map((w) => ({ userId: w.id, type, title, message, link }))
    });
  } catch (error) {
    console.error('notifyWardens error (non-fatal):', error.message);
  }
};

module.exports = {
  createNotification,
  notifyStudentById,
  notifyWardens
};
