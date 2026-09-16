const express = require('express');
const studentController = require('../controllers/studentController');
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

module.exports = router;
