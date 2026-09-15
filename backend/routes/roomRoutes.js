const express = require('express');
const { body } = require('express-validator');
const roomController = require('../controllers/roomController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// All room allocation routes require authentication and WARDEN role
router.use(authenticate);
router.use(authorizeRoles('WARDEN'));

// Validation rules
const allocateValidation = [
  body('studentId')
    .notEmpty().withMessage('Student is required')
    .isInt({ min: 1 }).withMessage('Invalid student').toInt(),
  body('roomId')
    .notEmpty().withMessage('Room is required')
    .isInt({ min: 1 }).withMessage('Invalid room').toInt(),
  body('bedId')
    .notEmpty().withMessage('Bed is required')
    .isInt({ min: 1 }).withMessage('Invalid bed').toInt()
];

// Rooms and bed availability
router.get('/', roomController.getRooms);

// Student search (place before /:id to avoid route collision)
router.get('/students/search', roomController.searchStudents);

// Allocation history
router.get('/allocations', roomController.getAllocations);

// Allocate a bed
router.post('/allocate', allocateValidation, roomController.allocateBed);

// Vacate an allocation
router.put('/allocations/:id/vacate', roomController.vacateAllocation);

// Single room details
router.get('/:id', roomController.getRoomById);

module.exports = router;
