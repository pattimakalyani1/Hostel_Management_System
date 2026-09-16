const prisma = require('../utils/prisma');
const { validationResult } = require('express-validator');

/**
 * Shared select for warden-facing student details on an outpass.
 */
const outpassStudentInclude = {
  student: {
    select: {
      id: true,
      name: true,
      phone: true,
      course: true,
      year: true,
      user: {
        select: {
          email: true
        }
      }
    }
  },
  warden: {
    select: {
      id: true,
      email: true
    }
  }
};

/**
 * Determine whether an APPROVED outpass is actually overdue right now.
 * An approved outpass is overdue when its expectedReturnTime has passed
 * and the student has not returned (actualReturnTime is null).
 */
const isOverdue = (outpass) => {
  return (
    outpass.status === 'APPROVED' &&
    !outpass.actualReturnTime &&
    new Date(outpass.expectedReturnTime).getTime() < Date.now()
  );
};

/**
 * Persist OVERDUE status for approved outpasses whose expected return time
 * has already passed. This keeps the stored status in sync when records are
 * fetched (no background scheduler is used in this project).
 *
 * @param {number[]} [ids] - Optional list of outpass ids to limit the update.
 */
const syncOverdueStatuses = async (ids) => {
  const where = {
    status: 'APPROVED',
    actualReturnTime: null,
    expectedReturnTime: { lt: new Date() }
  };
  if (Array.isArray(ids) && ids.length > 0) {
    where.id = { in: ids };
  }
  await prisma.outpass.updateMany({
    where,
    data: { status: 'OVERDUE' }
  });
};

/**
 * Resolve the Student record for the currently authenticated user.
 * Never trusts a frontend-supplied studentId.
 */
const getAuthenticatedStudent = async (userId) => {
  return prisma.student.findUnique({
    where: { userId }
  });
};

// ---------------------------------------------------------------------------
// STUDENT HANDLERS
// ---------------------------------------------------------------------------

/**
 * Apply for an outpass.
 * POST /api/outpass  (STUDENT)
 */
const createOutpass = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((err) => ({ field: err.path, message: err.msg }))
      });
    }

    const student = await getAuthenticatedStudent(req.user.userId);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const {
      outDate,
      leavingTime,
      expectedReturnTime,
      destination,
      reason,
      emergencyContact
    } = req.body;

    const leaving = new Date(leavingTime);
    const expectedReturn = new Date(expectedReturnTime);

    // Guard against a duplicate active request for the same leaving time
    const duplicate = await prisma.outpass.findFirst({
      where: {
        studentId: student.id,
        status: { in: ['PENDING', 'APPROVED', 'OVERDUE'] },
        leavingTime: leaving
      }
    });
    if (duplicate) {
      return res.status(409).json({
        message: 'You already have an active outpass request for this leaving time.'
      });
    }

    const outpass = await prisma.outpass.create({
      data: {
        studentId: student.id,
        outDate: new Date(outDate),
        leavingTime: leaving,
        expectedReturnTime: expectedReturn,
        destination: destination.trim(),
        reason: reason.trim(),
        emergencyContact: emergencyContact ? emergencyContact.trim() : null,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      message: 'Outpass request submitted successfully.',
      outpass
    });
  } catch (error) {
    console.error('Create outpass error:', error);
    next(error);
  }
};

/**
 * List the authenticated student's own outpass requests.
 * GET /api/outpass/my  (STUDENT)
 */
const getMyOutpasses = async (req, res, next) => {
  try {
    const student = await getAuthenticatedStudent(req.user.userId);
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Keep stored statuses accurate before returning.
    await syncOverdueStatuses();

    const outpasses = await prisma.outpass.findMany({
      where: { studentId: student.id },
      orderBy: { createdAt: 'desc' },
      include: {
        warden: { select: { id: true, email: true } }
      }
    });

    res.json({ outpasses });
  } catch (error) {
    console.error('Get my outpasses error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// WARDEN HANDLERS
// ---------------------------------------------------------------------------

/**
 * List outpasses by status group for the warden.
 * Used by /pending, /approved, /overdue.
 */
const listByStatus = (statuses) => async (req, res, next) => {
  try {
    await syncOverdueStatuses();

    const outpasses = await prisma.outpass.findMany({
      where: { status: { in: statuses } },
      orderBy: { createdAt: 'desc' },
      include: outpassStudentInclude
    });

    res.json({ outpasses });
  } catch (error) {
    console.error('List outpasses error:', error);
    next(error);
  }
};

/**
 * Full warden history (all statuses).
 * GET /api/outpass/all  (WARDEN)
 */
const getAllOutpasses = async (req, res, next) => {
  try {
    await syncOverdueStatuses();

    const outpasses = await prisma.outpass.findMany({
      orderBy: { createdAt: 'desc' },
      include: outpassStudentInclude
    });

    res.json({ outpasses });
  } catch (error) {
    console.error('Get all outpasses error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// SHARED: GET SINGLE OUTPASS (role-aware)
// ---------------------------------------------------------------------------

/**
 * Get a single outpass by id.
 * GET /api/outpass/:id  (STUDENT owner or WARDEN)
 * - Warden: full student details.
 * - Student: only their own record.
 */
const getOutpassById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid outpass id.' });
    }

    const outpass = await prisma.outpass.findUnique({
      where: { id },
      include: outpassStudentInclude
    });

    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found.' });
    }

    if (req.user.role === 'STUDENT') {
      const student = await getAuthenticatedStudent(req.user.userId);
      // Do not leak existence of other students' records.
      if (!student || outpass.studentId !== student.id) {
        return res.status(404).json({ message: 'Outpass not found.' });
      }
    }

    // Reflect overdue state in the single-record response too.
    if (isOverdue(outpass)) {
      const updated = await prisma.outpass.update({
        where: { id: outpass.id },
        data: { status: 'OVERDUE' },
        include: outpassStudentInclude
      });
      return res.json({ outpass: updated });
    }

    res.json({ outpass });
  } catch (error) {
    console.error('Get outpass by id error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// WARDEN ACTIONS
// ---------------------------------------------------------------------------

/**
 * Approve a pending outpass.
 * PUT /api/outpass/:id/approve  (WARDEN)
 */
const approveOutpass = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid outpass id.' });
    }

    const outpass = await prisma.outpass.findUnique({ where: { id } });
    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found.' });
    }

    if (outpass.status !== 'PENDING') {
      return res.status(409).json({
        message: `Only pending requests can be approved. Current status: ${outpass.status}.`
      });
    }

    const updated = await prisma.outpass.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: req.user.userId, // always derived from authentication
        approvedAt: new Date(),
        wardenComment: req.body?.wardenComment ? String(req.body.wardenComment).trim() : outpass.wardenComment
      },
      include: outpassStudentInclude
    });

    res.json({ message: 'Outpass approved.', outpass: updated });
  } catch (error) {
    console.error('Approve outpass error:', error);
    next(error);
  }
};

/**
 * Reject a pending outpass. A comment is required.
 * PUT /api/outpass/:id/reject  (WARDEN)
 */
const rejectOutpass = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((err) => ({ field: err.path, message: err.msg }))
      });
    }

    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid outpass id.' });
    }

    const outpass = await prisma.outpass.findUnique({ where: { id } });
    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found.' });
    }

    if (outpass.status !== 'PENDING') {
      return res.status(409).json({
        message: `Only pending requests can be rejected. Current status: ${outpass.status}.`
      });
    }

    const updated = await prisma.outpass.update({
      where: { id },
      data: {
        status: 'REJECTED',
        wardenComment: req.body.wardenComment.trim(),
        approvedBy: req.user.userId,
        approvedAt: new Date()
      },
      include: outpassStudentInclude
    });

    res.json({ message: 'Outpass rejected.', outpass: updated });
  } catch (error) {
    console.error('Reject outpass error:', error);
    next(error);
  }
};

/**
 * Mark an approved/overdue outpass as returned.
 * PUT /api/outpass/:id/return  (WARDEN)
 */
const returnOutpass = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (Number.isNaN(id)) {
      return res.status(400).json({ message: 'Invalid outpass id.' });
    }

    const outpass = await prisma.outpass.findUnique({ where: { id } });
    if (!outpass) {
      return res.status(404).json({ message: 'Outpass not found.' });
    }

    // Only an out student (APPROVED or OVERDUE) can be marked returned.
    if (!['APPROVED', 'OVERDUE'].includes(outpass.status)) {
      return res.status(409).json({
        message: `Only approved or overdue outpasses can be marked returned. Current status: ${outpass.status}.`
      });
    }

    const updated = await prisma.outpass.update({
      where: { id },
      data: {
        status: 'RETURNED',
        actualReturnTime: new Date() // server time, never trusted from frontend
      },
      include: outpassStudentInclude
    });

    res.json({ message: 'Student marked as returned.', outpass: updated });
  } catch (error) {
    console.error('Return outpass error:', error);
    next(error);
  }
};

module.exports = {
  // student
  createOutpass,
  getMyOutpasses,
  // warden
  getPending: listByStatus(['PENDING']),
  getApproved: listByStatus(['APPROVED']),
  getOverdue: listByStatus(['OVERDUE']),
  getAllOutpasses,
  // shared
  getOutpassById,
  // warden actions
  approveOutpass,
  rejectOutpass,
  returnOutpass
};
