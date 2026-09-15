const { validationResult } = require('express-validator');
const authService = require('../services/authService');

/**
 * Register a new student
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    
    const { email, password, name, phone, course, year, address } = req.body;
    
    const result = await authService.registerStudent({
      email,
      password,
      name,
      phone,
      course,
      year,
      address
    });
    
    res.status(201).json({
      message: 'Registration successful. Please login.',
      user: result
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Login user
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    
    const { email, password } = req.body;
    
    const result = await authService.login({ email, password });
    
    res.json({
      message: 'Login successful',
      token: result.token,
      user: result.user
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Get current user
 * GET /api/auth/me
 */
const me = async (req, res, next) => {
  try {
    const user = await authService.getCurrentUser(req.user.userId);
    res.json({ user });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Forgot password
 * POST /api/auth/forgot-password
 */
const forgotPassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    
    const { email } = req.body;
    
    const result = await authService.forgotPassword(email);
    
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Reset password
 * POST /api/auth/reset-password
 */
const resetPassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    
    const { token, password } = req.body;
    
    const result = await authService.resetPassword(token, password);
    
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

/**
 * Change password
 * PUT /api/auth/change-password
 */
const changePassword = async (req, res, next) => {
  try {
    // Validate request
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed',
        errors: errors.array().map(err => ({ field: err.path, message: err.msg }))
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    const result = await authService.changePassword(
      req.user.userId,
      currentPassword,
      newPassword
    );
    
    res.json(result);
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    next(error);
  }
};

module.exports = {
  register,
  login,
  me,
  forgotPassword,
  resetPassword,
  changePassword
};
