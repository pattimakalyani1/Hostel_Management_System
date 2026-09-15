const { PrismaClient } = require('@prisma/client');
const { body, param, query, validationResult } = require('express-validator');

const prisma = new PrismaClient();

// Valid categories and statuses matching Prisma enums
const VALID_CATEGORIES = ['WATER', 'ELECTRICITY', 'FAN_AC', 'CLEANING', 'WIFI', 'FOOD', 'OTHER'];
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'REJECTED'];

// ==================== STUDENT OPERATIONS ====================

/**
 * Create a new complaint
 * POST /api/student/complaints
 */
const createComplaint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const { title, description, category } = req.body;

    // Get student profile from authenticated user
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const complaint = await prisma.complaint.create({
      data: {
        studentId: student.id,
        title: title.trim(),
        description: description.trim(),
        category
      }
    });

    res.status(201).json({
      message: 'Complaint submitted successfully.',
      complaint
    });
  } catch (error) {
    console.error('Create complaint error:', error);
    next(error);
  }
};

/**
 * Get all complaints for the logged-in student
 * GET /api/student/complaints
 */
const getStudentComplaints = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const { status, category } = req.query;

    const where = { studentId: student.id };
    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }

    const complaints = await prisma.complaint.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    res.json(complaints);
  } catch (error) {
    console.error('Get student complaints error:', error);
    next(error);
  }
};

/**
 * Get a single complaint detail for the logged-in student
 * GET /api/student/complaints/:id
 */
const getStudentComplaintById = async (req, res, next) => {
  try {
    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }

    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const complaint = await prisma.complaint.findFirst({
      where: {
        id: complaintId,
        studentId: student.id
      }
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('Get complaint by ID error:', error);
    next(error);
  }
};

// ==================== WARDEN OPERATIONS ====================

/**
 * Get all complaints (with filters and search)
 * GET /api/warden/complaints
 */
const getAllComplaints = async (req, res, next) => {
  try {
    const { status, category, search } = req.query;

    const where = {};

    if (status && VALID_STATUSES.includes(status)) {
      where.status = status;
    }
    if (category && VALID_CATEGORIES.includes(category)) {
      where.category = category;
    }
    if (search) {
      const searchTerm = search.trim();
      // Search by complaint ID (if numeric), student name, or title
      const searchNum = parseInt(searchTerm);
      where.OR = [
        { title: { contains: searchTerm, mode: 'insensitive' } },
        { student: { name: { contains: searchTerm, mode: 'insensitive' } } },
        ...(isNaN(searchNum) ? [] : [{ id: searchNum }])
      ];
    }

    const complaints = await prisma.complaint.findMany({
      where,
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            course: true,
            year: true,
            allocations: {
              where: { status: 'ACTIVE' },
              include: {
                room: { select: { roomNumber: true, floor: true } }
              },
              take: 1
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    res.json(complaints);
  } catch (error) {
    console.error('Get all complaints error:', error);
    next(error);
  }
};

/**
 * Get a single complaint detail (warden view)
 * GET /api/warden/complaints/:id
 */
const getComplaintById = async (req, res, next) => {
  try {
    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }

    const complaint = await prisma.complaint.findUnique({
      where: { id: complaintId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            phone: true,
            course: true,
            year: true,
            user: { select: { email: true } },
            allocations: {
              where: { status: 'ACTIVE' },
              include: {
                room: { select: { roomNumber: true, floor: true } },
                bed: { select: { bedNumber: true } }
              },
              take: 1
            }
          }
        }
      }
    });

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    res.json(complaint);
  } catch (error) {
    console.error('Get complaint by ID error:', error);
    next(error);
  }
};

/**
 * Update complaint status and/or add warden response
 * PUT /api/warden/complaints/:id
 */
const updateComplaint = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array()[0].msg });
    }

    const complaintId = parseInt(req.params.id);
    if (isNaN(complaintId)) {
      return res.status(400).json({ message: 'Invalid complaint ID.' });
    }

    const { status, wardenResponse } = req.body;

    // Check complaint exists
    const existing = await prisma.complaint.findUnique({
      where: { id: complaintId }
    });

    if (!existing) {
      return res.status(404).json({ message: 'Complaint not found.' });
    }

    const updateData = {};

    if (status && VALID_STATUSES.includes(status)) {
      updateData.status = status;
      // Auto-set resolvedAt when resolved
      if (status === 'RESOLVED') {
        updateData.resolvedAt = new Date();
      }
      // Clear resolvedAt if re-opening
      if (status === 'OPEN' || status === 'IN_PROGRESS') {
        updateData.resolvedAt = null;
      }
    }

    if (wardenResponse !== undefined) {
      updateData.wardenResponse = wardenResponse.trim();
    }

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ message: 'No valid fields to update.' });
    }

    const updated = await prisma.complaint.update({
      where: { id: complaintId },
      data: updateData,
      include: {
        student: {
          select: {
            name: true,
            allocations: {
              where: { status: 'ACTIVE' },
              include: {
                room: { select: { roomNumber: true } }
              },
              take: 1
            }
          }
        }
      }
    });

    res.json({
      message: 'Complaint updated successfully.',
      complaint: updated
    });
  } catch (error) {
    console.error('Update complaint error:', error);
    next(error);
  }
};

/**
 * Get complaint statistics for warden dashboard
 * GET /api/warden/complaints/stats
 */
const getComplaintStats = async (req, res, next) => {
  try {
    const [total, open, inProgress, resolved, rejected] = await Promise.all([
      prisma.complaint.count(),
      prisma.complaint.count({ where: { status: 'OPEN' } }),
      prisma.complaint.count({ where: { status: 'IN_PROGRESS' } }),
      prisma.complaint.count({ where: { status: 'RESOLVED' } }),
      prisma.complaint.count({ where: { status: 'REJECTED' } })
    ]);

    // Category breakdown
    const categoryStats = await prisma.complaint.groupBy({
      by: ['category'],
      _count: { id: true }
    });

    const byCategory = {};
    categoryStats.forEach(item => {
      byCategory[item.category] = item._count.id;
    });

    res.json({
      total,
      open,
      inProgress,
      resolved,
      rejected,
      byCategory
    });
  } catch (error) {
    console.error('Get complaint stats error:', error);
    next(error);
  }
};

// Validation rules
const createComplaintValidation = [
  body('title')
    .trim()
    .notEmpty().withMessage('Title is required.')
    .isLength({ max: 200 }).withMessage('Title must be under 200 characters.'),
  body('description')
    .trim()
    .notEmpty().withMessage('Description is required.')
    .isLength({ max: 2000 }).withMessage('Description must be under 2000 characters.'),
  body('category')
    .trim()
    .notEmpty().withMessage('Category is required.')
    .isIn(VALID_CATEGORIES).withMessage('Invalid category.')
];

const updateComplaintValidation = [
  body('status')
    .optional()
    .isIn(VALID_STATUSES).withMessage('Invalid status.'),
  body('wardenResponse')
    .optional()
    .isLength({ max: 2000 }).withMessage('Response must be under 2000 characters.')
];

module.exports = {
  // Student
  createComplaint,
  createComplaintValidation,
  getStudentComplaints,
  getStudentComplaintById,
  // Warden
  getAllComplaints,
  getComplaintById,
  updateComplaint,
  updateComplaintValidation,
  getComplaintStats
};
