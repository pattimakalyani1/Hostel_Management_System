const express = require('express');
const { body, param } = require('express-validator');
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// All room routes require authentication
router.use(authenticate);

// ── Fee config – readable by any authenticated user ──────────────────────
router.get('/config', roomController.getFeeConfig);

// ── Room list + stats ─────────────────────────────────────────────────────
router.get('/', roomController.getRooms);

// ── Warden-only operations ───────────────────────────────────────────────
router.use(authorizeRoles('WARDEN'));

// Allocations (must be before /:id to avoid param conflict)
router.get('/allocations', roomController.getAllocations);
router.get('/students/search', roomController.searchStudents);
router.post('/allocate', roomController.allocateBed);
router.put('/allocations/:id/vacate', roomController.vacateAllocation);

// ── Room detail ───────────────────────────────────────────────────────────
router.get(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Room ID must be a positive integer.'),
  roomController.getRoomById
);

// POST /api/rooms
router.post(
  '/',
  [
    body('roomNumber')
      .trim()
      .notEmpty().withMessage('Room number is required.')
      .isLength({ max: 20 }).withMessage('Room number too long.'),
    body('floor')
      .notEmpty().withMessage('Floor is required.')
      .isInt({ min: 0 }).withMessage('Floor must be a non-negative integer.'),
    body('sharingType')
      .notEmpty().withMessage('Sharing type is required.')
      .isInt({ min: 1, max: 4 }).withMessage('Sharing type must be 1, 2, 3, or 4.'),
    body('description')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Description too long.'),
  ],
  roomController.createRoom
);

// PUT /api/rooms/:id
router.put(
  '/:id',
  [
    param('id').isInt({ min: 1 }).withMessage('Room ID must be a positive integer.'),
    body('floor')
      .optional()
      .isInt({ min: 0 }).withMessage('Floor must be a non-negative integer.'),
    body('sharingType')
      .optional()
      .isInt({ min: 1, max: 4 }).withMessage('Sharing type must be 1, 2, 3, or 4.'),
    body('description')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 500 }).withMessage('Description too long.'),
  ],
  roomController.updateRoom
);

// DELETE /api/rooms/:id
router.delete(
  '/:id',
  param('id').isInt({ min: 1 }).withMessage('Room ID must be a positive integer.'),
  roomController.deleteRoom
);

// PATCH /api/rooms/:roomId/beds/:bedId/maintenance
router.patch(
  '/:roomId/beds/:bedId/maintenance',
  [
    param('roomId').isInt({ min: 1 }).withMessage('Room ID must be a positive integer.'),
    param('bedId').isInt({ min: 1 }).withMessage('Bed ID must be a positive integer.'),
    body('status')
      .notEmpty().withMessage('Status is required.')
      .isIn(['AVAILABLE', 'MAINTENANCE']).withMessage('Status must be AVAILABLE or MAINTENANCE.'),
    body('maintenanceReason')
      .optional({ checkFalsy: true })
      .trim()
      .isLength({ max: 300 }).withMessage('Maintenance reason too long.'),
  ],
  roomController.updateBedMaintenance
);

module.exports = router;
