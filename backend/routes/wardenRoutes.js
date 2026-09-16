const express = require('express');
const wardenController = require('../controllers/wardenController');
const complaintController = require('../controllers/complaintController');
const wardenStudentsController = require('../controllers/wardenStudentsController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes require authentication and WARDEN role
router.use(authenticate);
router.use(authorizeRoles('WARDEN'));

// Warden dashboard
router.get('/dashboard', wardenController.getDashboard);

// Complaints
router.get('/complaints/stats', complaintController.getComplaintStats);
router.get('/complaints', complaintController.getAllComplaints);
router.get('/complaints/:id', complaintController.getComplaintById);
router.put('/complaints/:id', complaintController.updateComplaintValidation, complaintController.updateComplaint);

// Students
router.get('/students', wardenStudentsController.getAllStudents);
router.get('/students/:id', wardenStudentsController.getStudentById);
router.delete('/students/:id', wardenStudentsController.deleteStudent);

module.exports = router;
