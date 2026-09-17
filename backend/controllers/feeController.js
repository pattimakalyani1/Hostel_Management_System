const prisma = require('../utils/prisma');
const notificationService = require('../services/notificationService');

// Valid PaymentMethod enum values (mirrors the Prisma schema).
const VALID_PAYMENT_METHODS = ['CASH', 'UPI', 'CARD', 'ONLINE'];

/**
 * Compute successfully paid and outstanding amounts for a fee.
 * Only payments with status SUCCESS count towards the paid amount.
 * @param {object} fee - Fee record including its payments array
 * @returns {{ totalAmount: number, paidAmount: number, outstandingAmount: number }}
 */
const calculateFeeAmounts = (fee) => {
  const totalAmount = parseFloat(fee.amount);

  const paidAmount = (fee.payments || []).reduce((sum, payment) => {
    return payment.status === 'SUCCESS'
      ? sum + parseFloat(payment.amount)
      : sum;
  }, 0);

  const outstandingAmount = Math.max(totalAmount - paidAmount, 0);

  return { totalAmount, paidAmount, outstandingAmount };
};

/**
 * Derive the correct fee status from its financial state and due date.
 * Financial state is based only on SUCCESS payments (never FAILED/PENDING),
 * so status is never blindly trusted from a stale stored value.
 *
 * Priority rules:
 *  - outstanding === 0                         -> PAID   (PAID beats OVERDUE)
 *  - outstanding > 0 and dueDate has passed    -> OVERDUE
 *  - paid > 0 and outstanding > 0 (not overdue)-> PARTIAL
 *  - paid === 0 (not overdue)                  -> PENDING
 *
 * @param {object} fee - Fee record including its payments array
 * @param {Date} [now] - Reference "current" time (defaults to new Date())
 * @returns {'PENDING'|'PARTIAL'|'PAID'|'OVERDUE'}
 */
const deriveFeeStatus = (fee, now = new Date()) => {
  const { paidAmount, outstandingAmount } = calculateFeeAmounts(fee);

  // Fully paid always wins, even if the due date has passed.
  if (outstandingAmount === 0) {
    return 'PAID';
  }

  // Not fully paid and past due.
  const dueDate = fee.dueDate ? new Date(fee.dueDate) : null;
  if (dueDate && dueDate.getTime() < now.getTime()) {
    return 'OVERDUE';
  }

  // Not fully paid, not overdue.
  if (paidAmount > 0) {
    return 'PARTIAL';
  }

  return 'PENDING';
};

/**
 * Ensure the stored fee.status matches its derived status. If it differs,
 * persist the corrected value. This keeps status consistent lazily on read
 * without any background scheduler. Returns the effective (derived) status.
 *
 * @param {object} fee - Fee record including its payments array
 * @param {object} [client] - Prisma client or transaction client
 * @returns {Promise<string>} the derived (and now persisted) status
 */
const reconcileFeeStatus = async (fee, client = prisma) => {
  const derived = deriveFeeStatus(fee);
  if (derived !== fee.status) {
    await client.fee.update({
      where: { id: fee.id },
      data: { status: derived }
    });
  }
  return derived;
};

/**
 * Serialize a payment record for API responses.
 * @param {object} payment - Payment record
 */
const serializePayment = (payment) => ({
  id: payment.id,
  amount: parseFloat(payment.amount),
  paymentDate: payment.paymentDate,
  paymentMethod: payment.paymentMethod,
  transactionId: payment.transactionId,
  status: payment.status
});

/**
 * Get all fees for the logged-in student ("My Fees")
 * GET /api/fees/my
 */
const getMyFees = async (req, res, next) => {
  try {
    // Get student from authenticated user (never trust frontend-provided studentId)
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      select: { id: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Fetch all fees belonging to the student, including their payments
    const fees = await prisma.fee.findMany({
      where: { studentId: student.id },
      orderBy: { dueDate: 'asc' },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    // Shape each fee and compute paid / outstanding amounts from SUCCESS payments.
    // Status is derived from live financial state + dueDate (never trusted blindly).
    const feesData = fees.map((fee) => {
      const { totalAmount, paidAmount, outstandingAmount } = calculateFeeAmounts(fee);

      return {
        id: fee.id,
        amount: totalAmount,
        paidAmount: paidAmount,
        outstandingAmount: outstandingAmount,
        dueDate: fee.dueDate,
        description: fee.description,
        status: deriveFeeStatus(fee),
        payments: fee.payments.map(serializePayment)
      };
    });

    // Lazily reconcile any stored statuses that drifted (e.g. became overdue).
    await Promise.all(
      fees
        .filter((fee) => deriveFeeStatus(fee) !== fee.status)
        .map((fee) => reconcileFeeStatus(fee))
    );

    // Total outstanding across all of the student's fees
    const totalOutstanding = feesData.reduce((sum, fee) => {
      return sum + fee.outstandingAmount;
    }, 0);

    res.json({
      fees: feesData,
      totalOutstanding: totalOutstanding
    });
  } catch (error) {
    console.error('My fees error:', error);
    next(error);
  }
};

/**
 * Get payment history for the logged-in student
 * GET /api/fees/my/payments
 */
const getMyPayments = async (req, res, next) => {
  try {
    // Identify the student from the authenticated user (never trust the frontend)
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      select: { id: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Fetch all payments for this student, newest first, with related fee info
    const payments = await prisma.payment.findMany({
      where: { studentId: student.id },
      orderBy: { paymentDate: 'desc' },
      include: {
        fee: {
          select: {
            id: true,
            amount: true,
            description: true,
            dueDate: true,
            status: true
          }
        }
      }
    });

    const paymentsData = payments.map((payment) => ({
      id: payment.id,
      amount: parseFloat(payment.amount),
      paymentDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      transactionId: payment.transactionId,
      status: payment.status,
      fee: {
        id: payment.fee.id,
        amount: parseFloat(payment.fee.amount),
        description: payment.fee.description,
        dueDate: payment.fee.dueDate,
        status: payment.fee.status
      }
    }));

    res.json({ payments: paymentsData });
  } catch (error) {
    console.error('My payments error:', error);
    next(error);
  }
};

/**
 * Serialize a payment record (including student and fee) for Warden responses.
 * @param {object} payment - Payment record with `student.user` and `fee` included
 */
const serializePaymentWithDetails = (payment) => ({
  id: payment.id,
  amount: parseFloat(payment.amount),
  paymentDate: payment.paymentDate,
  paymentMethod: payment.paymentMethod,
  transactionId: payment.transactionId,
  status: payment.status,
  student: {
    id: payment.student.id,
    name: payment.student.name,
    email: payment.student.user.email
  },
  fee: {
    id: payment.fee.id,
    amount: parseFloat(payment.fee.amount),
    description: payment.fee.description,
    dueDate: payment.fee.dueDate,
    status: payment.fee.status
  }
});

// Prisma include shape shared by the Warden payment list/detail endpoints.
const WARDEN_PAYMENT_INCLUDE = {
  student: {
    select: {
      id: true,
      name: true,
      user: {
        select: {
          email: true
        }
      }
    }
  },
  fee: {
    select: {
      id: true,
      amount: true,
      description: true,
      dueDate: true,
      status: true
    }
  }
};

/**
 * Warden: Get all payments made by students
 * GET /api/fees/payments
 */
const getAllPayments = async (req, res, next) => {
  try {
    const payments = await prisma.payment.findMany({
      orderBy: { paymentDate: 'desc' },
      include: WARDEN_PAYMENT_INCLUDE
    });

    res.json({ payments: payments.map(serializePaymentWithDetails) });
  } catch (error) {
    console.error('Get all payments error:', error);
    next(error);
  }
};

/**
 * Warden: Get a single payment by id
 * GET /api/fees/payments/:id
 */
const getPaymentById = async (req, res, next) => {
  try {
    const paymentId = parseInt(req.params.id, 10);
    if (Number.isNaN(paymentId)) {
      return res.status(400).json({ message: 'Invalid payment id.' });
    }

    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: WARDEN_PAYMENT_INCLUDE
    });

    if (!payment) {
      return res.status(404).json({ message: 'Payment not found.' });
    }

    res.json({ payment: serializePaymentWithDetails(payment) });
  } catch (error) {
    console.error('Get payment by id error:', error);
    next(error);
  }
};

/**
 * Warden: Overall fee/payment collection summary
 * GET /api/fees/summary
 */
const getSummary = async (req, res, next) => {
  try {
    // Fetch all fees with their payments to compute amounts from SUCCESS payments only.
    const fees = await prisma.fee.findMany({
      include: {
        payments: true
      }
    });

    let totalFeeAmount = 0;
    let totalPaidAmount = 0;
    let totalOutstandingAmount = 0;
    let pendingFeesCount = 0;
    let partialFeesCount = 0;
    let paidFeesCount = 0;
    let overdueFeesCount = 0;

    const feesToReconcile = [];

    for (const fee of fees) {
      const { totalAmount, paidAmount, outstandingAmount } = calculateFeeAmounts(fee);

      totalFeeAmount += totalAmount;
      totalPaidAmount += paidAmount;
      totalOutstandingAmount += outstandingAmount;

      // Count by derived status so amounts and status counts are consistent
      // (based on SUCCESS payments + dueDate). No scheduler is required; any
      // drifted stored status is reconciled lazily below.
      const derived = deriveFeeStatus(fee);
      if (derived !== fee.status) {
        feesToReconcile.push(fee);
      }

      switch (derived) {
        case 'PENDING':
          pendingFeesCount += 1;
          break;
        case 'PARTIAL':
          partialFeesCount += 1;
          break;
        case 'PAID':
          paidFeesCount += 1;
          break;
        case 'OVERDUE':
          overdueFeesCount += 1;
          break;
        default:
          break;
      }
    }

    // Lazily persist any statuses that drifted (e.g. newly overdue fees).
    await Promise.all(feesToReconcile.map((fee) => reconcileFeeStatus(fee)));

    // Count all payment records (any status) without double counting.
    const totalPayments = await prisma.payment.count();

    res.json({
      summary: {
        totalFees: fees.length,
        totalFeeAmount: totalFeeAmount,
        totalPaidAmount: totalPaidAmount,
        totalOutstandingAmount: totalOutstandingAmount,
        pendingFeesCount: pendingFeesCount,
        partialFeesCount: partialFeesCount,
        paidFeesCount: paidFeesCount,
        overdueFeesCount: overdueFeesCount,
        totalPayments: totalPayments
      }
    });
  } catch (error) {
    console.error('Fee summary error:', error);
    next(error);
  }
};

/**
 * Warden: List students (id, name, email) for use in the fee assignment UI.
 * Only non-sensitive fields are exposed (no passwords).
 * GET /api/fees/students
 */
const getStudentsList = async (req, res, next) => {
  try {
    const students = await prisma.student.findMany({
      orderBy: { name: 'asc' },
      select: {
        id: true,
        name: true,
        user: {
          select: {
            email: true
          }
        }
      }
    });

    const studentsData = students.map((student) => ({
      id: student.id,
      name: student.name,
      email: student.user.email
    }));

    res.json({ students: studentsData });
  } catch (error) {
    console.error('Get students list error:', error);
    next(error);
  }
};

/**
 * Warden: Get all fees across all students
 * GET /api/fees
 */
const getAllFees = async (req, res, next) => {
  try {
    const fees = await prisma.fee.findMany({
      orderBy: { dueDate: 'asc' },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    const feesData = fees.map((fee) => {
      const { totalAmount, paidAmount, outstandingAmount } = calculateFeeAmounts(fee);

      return {
        id: fee.id,
        student: {
          id: fee.student.id,
          name: fee.student.name,
          email: fee.student.user.email
        },
        amount: totalAmount,
        paidAmount: paidAmount,
        outstandingAmount: outstandingAmount,
        dueDate: fee.dueDate,
        description: fee.description,
        status: deriveFeeStatus(fee),
        createdAt: fee.createdAt,
        updatedAt: fee.updatedAt,
        payments: fee.payments.map(serializePayment)
      };
    });

    // Lazily reconcile any stored statuses that drifted (e.g. became overdue).
    await Promise.all(
      fees
        .filter((fee) => deriveFeeStatus(fee) !== fee.status)
        .map((fee) => reconcileFeeStatus(fee))
    );

    res.json({ fees: feesData });
  } catch (error) {
    console.error('Get all fees error:', error);
    next(error);
  }
};

/**
 * Warden: Create a fee for a student
 * POST /api/fees
 */
const createFee = async (req, res, next) => {
  try {
    const { studentId, amount, dueDate, description } = req.body;

    // Validate required fields
    if (studentId === undefined || amount === undefined || dueDate === undefined) {
      return res.status(400).json({ message: 'studentId, amount and dueDate are required.' });
    }

    // Validate studentId is a valid integer
    const parsedStudentId = parseInt(studentId, 10);
    if (Number.isNaN(parsedStudentId)) {
      return res.status(400).json({ message: 'studentId must be a valid number.' });
    }

    // Validate amount is a number greater than 0
    const parsedAmount = parseFloat(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'amount must be a number greater than 0.' });
    }

    // Validate dueDate is a valid date
    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
      return res.status(400).json({ message: 'dueDate must be a valid date.' });
    }

    // Validate that the student exists
    const student = await prisma.student.findUnique({
      where: { id: parsedStudentId },
      select: { id: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Create the fee. Status always starts at PENDING (never trusted from frontend).
    const fee = await prisma.fee.create({
      data: {
        studentId: parsedStudentId,
        amount: parsedAmount,
        dueDate: parsedDueDate,
        description: description || null,
        status: 'PENDING'
      }
    });

    res.status(201).json({
      id: fee.id,
      studentId: fee.studentId,
      amount: parseFloat(fee.amount),
      dueDate: fee.dueDate,
      description: fee.description,
      status: fee.status,
      createdAt: fee.createdAt,
      updatedAt: fee.updatedAt
    });
  } catch (error) {
    console.error('Create fee error:', error);
    next(error);
  }
};

/**
 * Warden: Get a single fee by id
 * GET /api/fees/:id
 */
const getFeeById = async (req, res, next) => {
  try {
    const feeId = parseInt(req.params.id, 10);
    if (Number.isNaN(feeId)) {
      return res.status(400).json({ message: 'Invalid fee id.' });
    }

    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        student: {
          select: {
            id: true,
            name: true,
            user: {
              select: {
                email: true
              }
            }
          }
        },
        payments: {
          orderBy: { paymentDate: 'desc' }
        }
      }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found.' });
    }

    const { totalAmount, paidAmount, outstandingAmount } = calculateFeeAmounts(fee);

    // Derive status from live state and lazily persist if it drifted.
    const status = await reconcileFeeStatus(fee);

    res.json({
      id: fee.id,
      student: {
        id: fee.student.id,
        name: fee.student.name,
        email: fee.student.user.email
      },
      amount: totalAmount,
      paidAmount: paidAmount,
      outstandingAmount: outstandingAmount,
      dueDate: fee.dueDate,
      description: fee.description,
      status: status,
      createdAt: fee.createdAt,
      updatedAt: fee.updatedAt,
      payments: fee.payments.map(serializePayment)
    });
  } catch (error) {
    console.error('Get fee by id error:', error);
    next(error);
  }
};

/**
 * Warden: Update a fee's amount, dueDate and/or description
 * PUT /api/fees/:id
 */
const updateFee = async (req, res, next) => {
  try {
    const feeId = parseInt(req.params.id, 10);
    if (Number.isNaN(feeId)) {
      return res.status(400).json({ message: 'Invalid fee id.' });
    }

    // Ensure the fee exists (load payments so we can validate/reconcile status)
    const existingFee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: { payments: true }
    });

    if (!existingFee) {
      return res.status(404).json({ message: 'Fee not found.' });
    }

    const { amount, dueDate, description } = req.body;
    const data = {};

    // Validate and set amount if provided
    if (amount !== undefined) {
      const parsedAmount = parseFloat(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'amount must be a number greater than 0.' });
      }

      // Do not allow reducing the fee below what has already been successfully paid,
      // which would create an invalid financial state (paid > total).
      const { paidAmount } = calculateFeeAmounts(existingFee);
      if (parsedAmount < paidAmount) {
        return res.status(400).json({
          message: `amount cannot be less than the amount already paid (${paidAmount}).`
        });
      }

      data.amount = parsedAmount;
    }

    // Validate and set dueDate if provided
    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);
      if (Number.isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({ message: 'dueDate must be a valid date.' });
      }
      data.dueDate = parsedDueDate;
    }

    // Set description if provided (allow clearing to null)
    if (description !== undefined) {
      data.description = description || null;
    }

    // Nothing to update
    if (Object.keys(data).length === 0) {
      return res.status(400).json({ message: 'No valid fields provided to update.' });
    }

    // Note: status is never set directly from the frontend. Instead we re-derive
    // it from the updated amount/dueDate and existing SUCCESS payments.
    const derivedStatus = deriveFeeStatus({
      amount: data.amount !== undefined ? data.amount : existingFee.amount,
      dueDate: data.dueDate !== undefined ? data.dueDate : existingFee.dueDate,
      payments: existingFee.payments
    });
    data.status = derivedStatus;

    const fee = await prisma.fee.update({
      where: { id: feeId },
      data
    });

    res.json({
      id: fee.id,
      studentId: fee.studentId,
      amount: parseFloat(fee.amount),
      dueDate: fee.dueDate,
      description: fee.description,
      status: fee.status,
      createdAt: fee.createdAt,
      updatedAt: fee.updatedAt
    });
  } catch (error) {
    console.error('Update fee error:', error);
    next(error);
  }
};

/**
 * Warden: Delete a fee (only if it has no associated payments)
 * DELETE /api/fees/:id
 */
const deleteFee = async (req, res, next) => {
  try {
    const feeId = parseInt(req.params.id, 10);
    if (Number.isNaN(feeId)) {
      return res.status(400).json({ message: 'Invalid fee id.' });
    }

    // Ensure the fee exists
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      select: { id: true }
    });

    if (!fee) {
      return res.status(404).json({ message: 'Fee not found.' });
    }

    // Do not silently delete payment history. Reject if payments exist.
    const paymentCount = await prisma.payment.count({
      where: { feeId: feeId }
    });

    if (paymentCount > 0) {
      return res.status(409).json({
        message: 'Cannot delete a fee that has associated payments. Payment history must be preserved.'
      });
    }

    await prisma.fee.delete({
      where: { id: feeId }
    });

    res.json({ message: 'Fee deleted successfully.' });
  } catch (error) {
    console.error('Delete fee error:', error);
    next(error);
  }
};

/**
 * Student: Make a payment against one of their own fees
 * POST /api/fees/:feeId/payments
 */
const createPayment = async (req, res, next) => {
  try {
    // Validate feeId from the URL
    const feeId = parseInt(req.params.feeId, 10);
    if (Number.isNaN(feeId)) {
      return res.status(400).json({ message: 'Invalid fee id.' });
    }

    const { amount, paymentMethod, transactionId } = req.body;

    // Validate amount
    const parsedAmount = parseFloat(amount);
    if (amount === undefined || Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'amount is required and must be a number greater than 0.' });
    }

    // Validate paymentMethod
    if (!paymentMethod || !VALID_PAYMENT_METHODS.includes(paymentMethod)) {
      return res.status(400).json({
        message: `paymentMethod is required and must be one of: ${VALID_PAYMENT_METHODS.join(', ')}.`
      });
    }

    // Identify the logged-in student (never trust a studentId from the body)
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      select: { id: true, name: true }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    // Fetch the fee with its payments
    const fee = await prisma.fee.findUnique({
      where: { id: feeId },
      include: {
        payments: true
      }
    });

    // Fee must exist AND belong to the logged-in student.
    // If it belongs to another student, do not expose it: return the same 404.
    if (!fee || fee.studentId !== student.id) {
      return res.status(404).json({ message: 'Fee not found.' });
    }

    // Current successfully paid / outstanding amounts (SUCCESS payments only)
    const { totalAmount, paidAmount, outstandingAmount } = calculateFeeAmounts(fee);

    // Reject if the fee is already fully paid
    if (outstandingAmount <= 0) {
      return res.status(400).json({ message: 'This fee is already fully paid.' });
    }

    // Do not allow paying more than the outstanding amount
    if (parsedAmount > outstandingAmount) {
      return res.status(400).json({
        message: `Payment amount exceeds the outstanding balance of ${outstandingAmount}.`
      });
    }

    // If a transactionId is supplied, reject duplicates up front with a clear 409.
    if (transactionId) {
      const existingPayment = await prisma.payment.findUnique({
        where: { transactionId: transactionId },
        select: { id: true }
      });

      if (existingPayment) {
        return res.status(409).json({ message: 'A payment with this transactionId already exists.' });
      }
    }

    // Compute the new totals and the resulting fee status.
    const newPaidAmount = paidAmount + parsedAmount;
    const newOutstandingAmount = Math.max(totalAmount - newPaidAmount, 0);

    // Derive the resulting status from the fee's state *after* this payment,
    // including the new SUCCESS payment. PAID beats OVERDUE; an unpaid balance
    // past the due date becomes OVERDUE.
    const newStatus = deriveFeeStatus({
      amount: fee.amount,
      dueDate: fee.dueDate,
      payments: [...fee.payments, { amount: parsedAmount, status: 'SUCCESS' }]
    });

    // Create the payment and update the fee status atomically.
    // Status is always SUCCESS here (never trusted from the client).
    let result;
    try {
      result = await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.create({
          data: {
            studentId: student.id,
            feeId: fee.id,
            amount: parsedAmount,
            paymentMethod: paymentMethod,
            transactionId: transactionId || null,
            status: 'SUCCESS'
          }
        });

        const updatedFee = await tx.fee.update({
          where: { id: fee.id },
          data: { status: newStatus }
        });

        return { payment, updatedFee };
      });
    } catch (txError) {
      // Handle a race on the unique transactionId constraint gracefully.
      if (txError.code === 'P2002') {
        return res.status(409).json({ message: 'A payment with this transactionId already exists.' });
      }
      throw txError;
    }

    // Notify wardens that a payment was made (non-fatal).
    await notificationService.notifyWardens({
      type: 'PAYMENT',
      title: 'Payment Received',
      message: `${student.name} paid ₹${parsedAmount} towards ${fee.description || 'a fee'}.`,
      link: '/warden/fees'
    });

    res.status(201).json({
      message: 'Payment successful.',
      payment: serializePayment(result.payment),
      fee: {
        id: result.updatedFee.id,
        amount: totalAmount,
        paidAmount: newPaidAmount,
        outstandingAmount: newOutstandingAmount,
        status: result.updatedFee.status
      }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    next(error);
  }
};

module.exports = {
  getMyFees,
  getMyPayments,
  getAllFees,
  createFee,
  getFeeById,
  updateFee,
  deleteFee,
  createPayment,
  getAllPayments,
  getPaymentById,
  getSummary,
  getStudentsList
};
