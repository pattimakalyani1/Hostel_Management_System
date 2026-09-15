const express = require('express');
const wardenController = require('../controllers/wardenController');
const { authenticate } = require('../middleware/authMiddleware');
const { authorizeRoles } = require('../middleware/roleMiddleware');

const router = express.Router();

// All routes require authentication and WARDEN role
router.use(authenticate);
router.use(authorizeRoles('WARDEN'));

// Warden dashboard
router.get('/dashboard', wardenController.getDashboard);

module.exports = router;
