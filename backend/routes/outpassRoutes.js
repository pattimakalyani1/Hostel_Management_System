const express = require('express');
const { body } = require('express-validator');
const outpassController = require('../controllers/outpassController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// Every outpass route requires a valid authenticated user.
router.use(authenticate);

// Validation for applying for an outpass
const createOutpassValidation = [
  body('outDate')
    .notEmpty().withMessage('Out date is required')
    .isISO8601().withMessage('Out date must be a valid date'),
  body('leavingTime')
    .notEmpty().withMessage('Leaving time is required')
    .isISO8601().withMessage('Leaving time must be a valid date/time'),
  body('expectedReturnTime')
    .notEmpty().withMessage('Expected return time is required')
    .isISO8601().withMessage('Expected return time must be a valid date/time')
    .custom((value, { req }) => {
      const leaving = new Date(req.body.leavingTime);
      const expected = new Date(value);
      if (Number.isNaN(leaving.getTime()) || Number.isNaN(expected.getTime())) {
        return true; // handled by isISO8601 above
      }
      if (expected <= leaving) {
        throw new Error('Expected return time must be after the leaving time');
      }
      return true;
    }),
  body('destination')
    .trim()
    .notEmpty().withMessage('Destination is required')
    .isLength({ max: 200 }).withMessage('Destination is too long'),
  body('reason')
    .trim()
    .notEmpty().withMessage('Reason is required')
    .isLength({ max: 500 }).withMessage('Reason is too long'),
  body('emergencyContact')
    .optional({ checkFalsy: true })
    .trim()
    .isMobilePhone('any').withMessage('Please provide a valid emergency contact number')
];

// Validation for rejecting an outpass (comment required)
const rejectValidation = [
  body('wardenComment')
    .trim()
    .notEmpty().withMessage('A rejection comment is required')
    .isLength({ max: 500 }).withMessage('Comment is too long')
];

// -------------------- STUDENT ROUTES --------------------
router.post('/', authorizeRoles('STUDENT'), createOutpassValidation, outpassController.createOutpass);
router.get('/my', authorizeRoles('STUDENT'), outpassController.getMyOutpasses);

// -------------------- WARDEN ROUTES --------------------
router.get('/pending', authorizeRoles('WARDEN'), outpassController.getPending);
router.get('/approved', authorizeRoles('WARDEN'), outpassController.getApproved);
router.get('/overdue', authorizeRoles('WARDEN'), outpassController.getOverdue);
router.get('/all', authorizeRoles('WARDEN'), outpassController.getAllOutpasses);

router.put('/:id/approve', authorizeRoles('WARDEN'), outpassController.approveOutpass);
router.put('/:id/reject', authorizeRoles('WARDEN'), rejectValidation, outpassController.rejectOutpass);
router.put('/:id/return', authorizeRoles('WARDEN'), outpassController.returnOutpass);

// -------------------- SHARED (STUDENT owner or WARDEN) --------------------
// Keep this last so specific paths above are matched first.
router.get('/:id', authorizeRoles('STUDENT', 'WARDEN'), outpassController.getOutpassById);

module.exports = router;
