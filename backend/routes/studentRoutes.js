const express = require('express');
const studentController = require('../controllers/studentController');
const complaintController = require('../controllers/complaintController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes require authentication and STUDENT role
router.use(authenticate);
router.use(authorizeRoles('STUDENT'));

// Student dashboard
router.get('/dashboard', studentController.getDashboard);

// Student profile
router.get('/profile', studentController.getProfile);
router.put('/profile', studentController.updateProfile);

// Student room
router.get('/room', studentController.getRoom);

// Complaints
router.get('/complaints', complaintController.getStudentComplaints);
router.post('/complaints', complaintController.createComplaintValidation, complaintController.createComplaint);
router.get('/complaints/:id', complaintController.getStudentComplaintById);

module.exports = router;
