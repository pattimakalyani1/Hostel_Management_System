const { PrismaClient } = require('@prisma/client');
const { validationResult } = require('express-validator');

const prisma = new PrismaClient();

/**
 * Get all rooms with their beds and availability summary
 * GET /api/room
 */
const getRooms = async (req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        beds: {
          orderBy: { bedNumber: 'asc' },
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: {
                student: { select: { id: true, name: true } }
              },
              take: 1
            }
          }
        }
      }
    });

    const data = rooms.map((room) => {
      const beds = room.beds.map((bed) => {
        const activeAllocation = bed.allocations[0] || null;
        return {
          id: bed.id,
          bedNumber: bed.bedNumber,
          status: bed.status,
          occupant: activeAllocation
            ? { studentId: activeAllocation.student.id, studentName: activeAllocation.student.name }
            : null
        };
      });

      return {
        id: room.id,
        roomNumber: room.roomNumber,
        floor: room.floor,
        capacity: room.capacity,
        roomType: room.roomType,
        status: room.status,
        beds,
        totalBeds: beds.length,
        availableBeds: beds.filter((b) => b.status === 'AVAILABLE').length,
        occupiedBeds: beds.filter((b) => b.status === 'OCCUPIED').length,
        maintenanceBeds: beds.filter((b) => b.status === 'MAINTENANCE').length
      };
    });

    // Overall summary across all rooms/beds
    const summary = data.reduce(
      (acc, room) => {
        acc.totalBeds += room.totalBeds;
        acc.availableBeds += room.availableBeds;
        acc.occupiedBeds += room.occupiedBeds;
        acc.maintenanceBeds += room.maintenanceBeds;
        return acc;
      },
      { totalRooms: data.length, totalBeds: 0, availableBeds: 0, occupiedBeds: 0, maintenanceBeds: 0 }
    );

    res.json({ rooms: data, summary });
  } catch (error) {
    console.error('Get rooms error:', error);
    next(error);
  }
};

/**
 * Get a single room's details with beds
 * GET /api/room/:id
 */
const getRoomById = async (req, res, next) => {
  try {
    const roomId = parseInt(req.params.id, 10);
    if (Number.isNaN(roomId)) {
      return res.status(400).json({ message: 'Invalid room id.' });
    }

    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        beds: {
          orderBy: { bedNumber: 'asc' },
          include: {
            allocations: {
              where: { status: 'ACTIVE' },
              include: { student: { select: { id: true, name: true } } },
              take: 1
            }
          }
        }
      }
    });

    if (!room) {
      return res.status(404).json({ message: 'Room not found.' });
    }

    const beds = room.beds.map((bed) => {
      const activeAllocation = bed.allocations[0] || null;
      return {
        id: bed.id,
        bedNumber: bed.bedNumber,
        status: bed.status,
        occupant: activeAllocation
          ? { studentId: activeAllocation.student.id, studentName: activeAllocation.student.name }
          : null
      };
    });

    res.json({
      id: room.id,
      roomNumber: room.roomNumber,
      floor: room.floor,
      capacity: room.capacity,
      roomType: room.roomType,
      status: room.status,
      beds,
      totalBeds: beds.length,
      availableBeds: beds.filter((b) => b.status === 'AVAILABLE').length,
      occupiedBeds: beds.filter((b) => b.status === 'OCCUPIED').length,
      maintenanceBeds: beds.filter((b) => b.status === 'MAINTENANCE').length
    });
  } catch (error) {
    console.error('Get room by id error:', error);
    next(error);
  }
};

/**
 * Search students by name, id or email
 * GET /api/room/students/search?q=...
 */
const searchStudents = async (req, res, next) => {
  try {
    const q = (req.query.q || '').toString().trim();

    // Build a flexible filter: match name/email (contains) and id (if numeric)
    const orConditions = [];
    if (q) {
      orConditions.push({ name: { contains: q, mode: 'insensitive' } });
      orConditions.push({ user: { email: { contains: q, mode: 'insensitive' } } });
      const asId = parseInt(q, 10);
      if (!Number.isNaN(asId)) {
        orConditions.push({ id: asId });
      }
    }

    const students = await prisma.student.findMany({
      where: {
        user: { isActive: true },
        ...(orConditions.length > 0 ? { OR: orConditions } : {})
      },
      orderBy: { name: 'asc' },
      take: 20,
      include: {
        user: { select: { email: true } },
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            room: { select: { roomNumber: true } },
            bed: { select: { bedNumber: true } }
          },
          take: 1
        }
      }
    });

    const data = students.map((student) => {
      const active = student.allocations[0] || null;
      return {
        id: student.id,
        name: student.name,
        email: student.user.email,
        phone: student.phone,
        course: student.course,
        year: student.year,
        hasActiveAllocation: !!active,
        currentAllocation: active
          ? { roomNumber: active.room.roomNumber, bedNumber: active.bed.bedNumber }
          : null
      };
    });

    res.json({ students: data });
  } catch (error) {
    console.error('Search students error:', error);
    next(error);
  }
};

/**
 * Get allocation history (optionally filtered by status)
 * GET /api/room/allocations?status=ACTIVE|VACATED
 */
const getAllocations = async (req, res, next) => {
  try {
    const statusFilter = (req.query.status || '').toString().toUpperCase();
    const where = {};
    if (statusFilter === 'ACTIVE' || statusFilter === 'VACATED') {
      where.status = statusFilter;
    }

    const allocations = await prisma.allocation.findMany({
      where,
      orderBy: { allocatedDate: 'desc' },
      include: {
        student: { select: { id: true, name: true } },
        room: { select: { id: true, roomNumber: true, floor: true } },
        bed: { select: { id: true, bedNumber: true } }
      }
    });

    const data = allocations.map((a) => ({
      id: a.id,
      studentId: a.student.id,
      studentName: a.student.name,
      roomId: a.room.id,
      roomNumber: a.room.roomNumber,
      floor: a.room.floor,
      bedId: a.bed.id,
      bedNumber: a.bed.bedNumber,
      status: a.status,
      allocatedDate: a.allocatedDate,
      vacatedDate: a.vacatedDate
    }));

    res.json({ allocations: data });
  } catch (error) {
    console.error('Get allocations error:', error);
    next(error);
  }
};

/**
 * Allocate an available bed in a room to a student (atomic)
 * POST /api/room/allocate
 * body: { studentId, roomId, bedId }
 */
const allocateBed = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array().map((err) => ({ field: err.path, message: err.msg }))
      });
    }

    const { studentId, roomId, bedId } = req.body;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Verify the student exists
      const student = await tx.student.findUnique({ where: { id: studentId } });
      if (!student) {
        const error = new Error('Student not found.');
        error.status = 404;
        throw error;
      }

      // 2. Verify the room exists
      const room = await tx.room.findUnique({ where: { id: roomId } });
      if (!room) {
        const error = new Error('Room not found.');
        error.status = 404;
        throw error;
      }

      // 3. Verify the bed exists
      const bed = await tx.bed.findUnique({ where: { id: bedId } });
      if (!bed) {
        const error = new Error('Bed not found.');
        error.status = 404;
        throw error;
      }

      // 4. Verify the bed belongs to the selected room
      if (bed.roomId !== roomId) {
        const error = new Error('The selected bed does not belong to the selected room.');
        error.status = 400;
        throw error;
      }

      // 5 / 8 / 9. Verify the bed is AVAILABLE (blocks OCCUPIED and MAINTENANCE)
      if (bed.status !== 'AVAILABLE') {
        const error = new Error(`Bed ${bed.bedNumber} is not available (current status: ${bed.status}).`);
        error.status = 409;
        throw error;
      }

      // 6 / 7. Prevent duplicate active allocations for the student
      const existingActive = await tx.allocation.findFirst({
        where: { studentId, status: 'ACTIVE' }
      });
      if (existingActive) {
        const error = new Error('This student already has an active room allocation.');
        error.status = 409;
        throw error;
      }

      // Create the allocation (ACTIVE) and mark the bed OCCUPIED
      const allocation = await tx.allocation.create({
        data: {
          studentId,
          roomId,
          bedId,
          status: 'ACTIVE',
          allocatedDate: new Date()
        },
        include: {
          student: { select: { id: true, name: true } },
          room: { select: { id: true, roomNumber: true, floor: true } },
          bed: { select: { id: true, bedNumber: true } }
        }
      });

      await tx.bed.update({
        where: { id: bedId },
        data: { status: 'OCCUPIED' }
      });

      return allocation;
    });

    res.status(201).json({
      message: `Bed ${result.bed.bedNumber} in Room ${result.room.roomNumber} has been successfully allocated to ${result.student.name}.`,
      allocation: {
        id: result.id,
        studentId: result.student.id,
        studentName: result.student.name,
        roomId: result.room.id,
        roomNumber: result.room.roomNumber,
        floor: result.room.floor,
        bedId: result.bed.id,
        bedNumber: result.bed.bedNumber,
        status: result.status,
        allocatedDate: result.allocatedDate,
        vacatedDate: result.vacatedDate
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Allocate bed error:', error);
    next(error);
  }
};

/**
 * Vacate an active allocation (atomic)
 * PUT /api/room/allocations/:id/vacate
 */
const vacateAllocation = async (req, res, next) => {
  try {
    const allocationId = parseInt(req.params.id, 10);
    if (Number.isNaN(allocationId)) {
      return res.status(400).json({ message: 'Invalid allocation id.' });
    }

    const result = await prisma.$transaction(async (tx) => {
      const allocation = await tx.allocation.findUnique({
        where: { id: allocationId },
        include: {
          student: { select: { name: true } },
          room: { select: { roomNumber: true } },
          bed: { select: { id: true, bedNumber: true } }
        }
      });

      if (!allocation) {
        const error = new Error('Allocation not found.');
        error.status = 404;
        throw error;
      }

      if (allocation.status !== 'ACTIVE') {
        const error = new Error('This allocation is already vacated.');
        error.status = 409;
        throw error;
      }

      // Mark allocation VACATED and record vacated date (do NOT delete the record)
      const updated = await tx.allocation.update({
        where: { id: allocationId },
        data: { status: 'VACATED', vacatedDate: new Date() }
      });

      // Free the bed
      await tx.bed.update({
        where: { id: allocation.bed.id },
        data: { status: 'AVAILABLE' }
      });

      return { updated, allocation };
    });

    res.json({
      message: `Bed ${result.allocation.bed.bedNumber} in Room ${result.allocation.room.roomNumber} has been vacated for ${result.allocation.student.name}.`,
      allocation: {
        id: result.updated.id,
        status: result.updated.status,
        vacatedDate: result.updated.vacatedDate
      }
    });
  } catch (error) {
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    console.error('Vacate allocation error:', error);
    next(error);
  }
};

module.exports = {
  getRooms,
  getRoomById,
  searchStudents,
  getAllocations,
  allocateBed,
  vacateAllocation
};
