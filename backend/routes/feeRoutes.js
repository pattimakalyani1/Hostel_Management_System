const express = require('express');
const feeController = require('../controllers/feeController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

// Student: view own fees (STUDENT role only)
// Keep /my before /:id so "my" is not interpreted as a fee id.
router.get('/my', authorizeRoles('STUDENT'), feeController.getMyFees);

// Student: view own payment history (STUDENT role only)
// Placed before /:id so "my" is never interpreted as a fee id.
router.get('/my/payments', authorizeRoles('STUDENT'), feeController.getMyPayments);

// Student: make a payment against their own fee (STUDENT role only)
router.post('/:feeId/payments', authorizeRoles('STUDENT'), feeController.createPayment);

// Warden: Payment management + summary (WARDEN role only)
// These specific paths MUST be registered before the generic /:id route below,
// otherwise "payments" / "summary" would be captured as a fee id.
router.get('/payments', authorizeRoles('WARDEN'), feeController.getAllPayments);
router.get('/payments/:id', authorizeRoles('WARDEN'), feeController.getPaymentById);
router.get('/summary', authorizeRoles('WARDEN'), feeController.getSummary);
router.get('/students', authorizeRoles('WARDEN'), feeController.getStudentsList);

// Warden: Fees management (WARDEN role only)
router.get('/', authorizeRoles('WARDEN'), feeController.getAllFees);
router.post('/', authorizeRoles('WARDEN'), feeController.createFee);
router.get('/:id', authorizeRoles('WARDEN'), feeController.getFeeById);
router.put('/:id', authorizeRoles('WARDEN'), feeController.updateFee);
router.delete('/:id', authorizeRoles('WARDEN'), feeController.deleteFee);

module.exports = router;
