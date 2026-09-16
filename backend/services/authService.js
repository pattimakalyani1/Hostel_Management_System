const prisma = require('../utils/prisma');
const { hashPassword, comparePassword, generateResetToken, hashResetToken } = require('../utils/password');
const { generateToken } = require('../utils/jwt');

// In-memory store for reset tokens (for development)
// In production, use Redis or database
const resetTokens = new Map();
const RESET_TOKEN_EXPIRY = parseInt(process.env.RESET_TOKEN_EXPIRY) || 30; // minutes

/**
 * Register a new student
 */
const registerStudent = async ({ email, password, name, phone, course, year, address }) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  if (existingUser) {
    const error = new Error('Email already registered.');
    error.status = 409;
    throw error;
  }
  
  // Hash password
  const hashedPassword = await hashPassword(password);
  
  // Create user and student profile in transaction
  const result = await prisma.$transaction(async (tx) => {
    // Create user
    const user = await tx.user.create({
      data: {
        email: email.toLowerCase(),
        password: hashedPassword,
        role: 'STUDENT',
        isActive: true
      }
    });
    
    // Create student profile
    const student = await tx.student.create({
      data: {
        userId: user.id,
        name,
        phone: phone || null,
        course: course || null,
        year: year ? parseInt(year) : null,
        address: address || null
      }
    });
    
    return { user, student };
  });
  
  return {
    id: result.user.id,
    email: result.user.email,
    role: result.user.role,
    studentId: result.student.id,
    name: result.student.name
  };
};

/**
 * Login user (Student or Warden)
 */
const login = async ({ email, password }) => {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    include: {
      student: {
        select: {
          id: true,
          name: true
        }
      }
    }
  });
  
  if (!user) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }
  
  // Check if user is active
  if (!user.isActive) {
    const error = new Error('Account is deactivated. Please contact administrator.');
    error.status = 401;
    throw error;
  }
  
  // Verify password
  const isPasswordValid = await comparePassword(password, user.password);
  
  if (!isPasswordValid) {
    const error = new Error('Invalid email or password.');
    error.status = 401;
    throw error;
  }
  
  // Generate token
  const token = generateToken({
    userId: user.id,
    role: user.role
  });
  
  // Prepare user response (never include password)
  const userResponse = {
    id: user.id,
    email: user.email,
    role: user.role,
    ...(user.student && { name: user.student.name, studentId: user.student.id })
  };
  
  return { token, user: userResponse };
};

/**
 * Get current user details
 */
const getCurrentUser = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
      student: {
        select: {
          id: true,
          name: true,
          phone: true,
          course: true,
          year: true,
          address: true
        }
      }
    }
  });
  
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  
  return user;
};

/**
 * Initiate forgot password process
 */
const forgotPassword = async (email) => {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
  
  // Always return success to prevent email enumeration
  if (!user) {
    return { message: 'If an account exists with this email, password reset instructions have been sent.' };
  }
  
  // Generate reset token
  const resetToken = generateResetToken();
  const hashedToken = hashResetToken(resetToken);
  
  // Store token with expiry (in-memory for development)
  resetTokens.set(hashedToken, {
    userId: user.id,
    email: user.email,
    expiresAt: new Date(Date.now() + RESET_TOKEN_EXPIRY * 60 * 1000)
  });
  
  // In production, send email with reset link
  // For development, return the token
  console.log(`[DEV] Password reset token for ${email}: ${resetToken}`);
  
  return {
    message: 'If an account exists with this email, password reset instructions have been sent.',
    // Development only - remove in production
    ...(process.env.NODE_ENV !== 'production' && { 
      devToken: resetToken,
      devNote: 'This token is only shown in development mode. Use it to reset your password.'
    })
  };
};

/**
 * Reset password with token
 */
const resetPassword = async (token, newPassword) => {
  const hashedToken = hashResetToken(token);
  const tokenData = resetTokens.get(hashedToken);
  
  if (!tokenData) {
    const error = new Error('Invalid or expired reset token.');
    error.status = 400;
    throw error;
  }
  
  if (new Date() > tokenData.expiresAt) {
    resetTokens.delete(hashedToken);
    const error = new Error('Reset token has expired. Please request a new one.');
    error.status = 400;
    throw error;
  }
  
  // Hash new password
  const hashedPassword = await hashPassword(newPassword);
  
  // Update user password
  await prisma.user.update({
    where: { id: tokenData.userId },
    data: { password: hashedPassword }
  });
  
  // Remove used token
  resetTokens.delete(hashedToken);
  
  return { message: 'Password has been reset successfully. Please login with your new password.' };
};

/**
 * Change password for authenticated user
 */
const changePassword = async (userId, currentPassword, newPassword) => {
  // Get user with password
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });
  
  if (!user) {
    const error = new Error('User not found.');
    error.status = 404;
    throw error;
  }
  
  // Verify current password
  const isPasswordValid = await comparePassword(currentPassword, user.password);
  
  if (!isPasswordValid) {
    const error = new Error('Current password is incorrect.');
    error.status = 400;
    throw error;
  }
  
  // Hash new password
  const hashedPassword = await hashPassword(newPassword);
  
  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword }
  });
  
  return { message: 'Password changed successfully.' };
};

module.exports = {
  registerStudent,
  login,
  getCurrentUser,
  forgotPassword,
  resetPassword,
  changePassword
};
