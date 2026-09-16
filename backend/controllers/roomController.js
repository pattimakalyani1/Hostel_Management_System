const prisma = require('../utils/prisma');

// ---------------------------------------------------------------------------
// Fee configuration – single source of truth
// ---------------------------------------------------------------------------
const BASE_4_SHARING_FEE = parseInt(process.env.BASE_4_SHARING_FEE || '5000', 10);

function calculateFee(sharingType) {
  return BASE_4_SHARING_FEE + (4 - sharingType) * 500;
}

// ---------------------------------------------------------------------------
// Derive room status from its beds.
// OCCUPIED is only counted when the bed has an active allocation.
// ---------------------------------------------------------------------------
function deriveRoomStatus(beds) {
  if (!beds || beds.length === 0) return 'AVAILABLE';

  const total = beds.length;

  const occupied = beds.filter(b => {
    const hasActiveAlloc = (b.allocations || []).some(a => a.status === 'ACTIVE');
    return b.status === 'OCCUPIED' && hasActiveAlloc;
  }).length;

  const maintenance = beds.filter(b => b.status === 'MAINTENANCE').length;
  const available   = total - occupied - maintenance;

  if (maintenance === total)                                              return 'MAINTENANCE';
  if (occupied > 0 && available <= 0 && occupied + maintenance === total) return 'FULL';
  if (occupied > 0)                                                       return 'PARTIALLY_OCCUPIED';
  return 'AVAILABLE';
}

// ---------------------------------------------------------------------------
// Shape a room record with computed fields for API responses
// ---------------------------------------------------------------------------
function formatRoom(room) {
  const beds = room.beds || [];

  const occupied = beds.filter(b => {
    const hasActiveAlloc = (b.allocations || []).some(a => a.status === 'ACTIVE');
    return b.status === 'OCCUPIED' && hasActiveAlloc;
  }).length;

  const maintenance = beds.filter(b => b.status === 'MAINTENANCE').length;
  const available   = beds.length - occupied - maintenance;
  const fee         = calculateFee(room.sharingType);
  const status      = deriveRoomStatus(beds);

  return {
    id:              room.id,
    roomNumber:      room.roomNumber,
    floor:           room.floor,
    sharingType:     room.sharingType,
    capacity:        room.sharingType,
    description:     room.description,
    roomType:        `${room.sharingType} Sharing`,
    fee,
    status,
    occupiedBeds:    occupied,
    availableBeds:   available,
    maintenanceBeds: maintenance,
    totalBeds:       beds.length,
    createdAt:       room.createdAt,
    updatedAt:       room.updatedAt,
  };
}

// ---------------------------------------------------------------------------
// Shape a bed record with its student (from active allocation).
// Data-integrity guard: OCCUPIED + no active allocation → reported as AVAILABLE.
// ---------------------------------------------------------------------------
function formatBed(bed) {
  const activeAlloc = (bed.allocations || []).find(a => a.status === 'ACTIVE');
  const student     = activeAlloc?.student || null;

  let resolvedStatus = bed.status;
  if (bed.status === 'OCCUPIED' && !student) {
    resolvedStatus = 'AVAILABLE';
    console.warn(`[integrity] Bed id:${bed.id} "${bed.bedNumber}" is OCCUPIED in DB but has no active allocation – reporting as AVAILABLE`);
  }

  return {
    id:                bed.id,
    bedNumber:         bed.bedNumber,
    status:            resolvedStatus,
    maintenanceReason: bed.maintenanceReason,
    maintenanceDate:   bed.maintenanceDate,
    student: student ? {
      id:     student.id,
      name:   student.name,
      phone:  student.phone,
      course: student.course,
      year:   student.year,
      email:  student.user?.email || null,
    } : null,
  };
}

// ---------------------------------------------------------------------------
// Prisma include fragment used in all single-room queries
// ---------------------------------------------------------------------------
const ROOM_DETAIL_INCLUDE = {
  beds: {
    orderBy: { bedNumber: 'asc' },
    include: {
      allocations: {
        where:   { status: 'ACTIVE' },
        include: {
          student: {
            include: { user: { select: { email: true } } }
          }
        }
      }
    }
  }
};

// ---------------------------------------------------------------------------
// GET /api/rooms
// ---------------------------------------------------------------------------
const getRooms = async (req, res, next) => {
  try {
    const { search, floor, sharingType, status } = req.query;

    const where = {};
    if (search)                               where.roomNumber  = { contains: search, mode: 'insensitive' };
    if (floor       && !isNaN(parseInt(floor)))       where.floor       = parseInt(floor);
    if (sharingType && !isNaN(parseInt(sharingType))) where.sharingType = parseInt(sharingType);

    const rooms = await prisma.room.findMany({
      where,
      orderBy: [{ floor: 'asc' }, { roomNumber: 'asc' }],
      include: {
        beds: {
          include: {
            allocations: {
              where:   { status: 'ACTIVE' },
              include: { student: { include: { user: { select: { email: true } } } } }
            }
          }
        }
      }
    });

    let formatted = rooms.map(formatRoom);
    if (status) formatted = formatted.filter(r => r.status === status.toUpperCase());

    // Aggregate stats – include allocations so deriveRoomStatus is accurate
    const allRooms = await prisma.room.findMany({
      include: { beds: { include: { allocations: { where: { status: 'ACTIVE' } } } } }
    });

    let totalRooms = allRooms.length, availableRooms = 0, partiallyOccupied = 0,
        fullRooms  = 0, maintenanceRooms = 0, totalBeds = 0,
        occupiedBeds = 0, availableBeds = 0, maintenanceBeds = 0;

    for (const r of allRooms) {
      const s = deriveRoomStatus(r.beds);
      if (s === 'AVAILABLE')               availableRooms++;
      else if (s === 'PARTIALLY_OCCUPIED') partiallyOccupied++;
      else if (s === 'FULL')               fullRooms++;
      else if (s === 'MAINTENANCE')        maintenanceRooms++;

      for (const b of r.beds) {
        totalBeds++;
        const trulyOccupied = b.status === 'OCCUPIED' && (b.allocations?.length > 0);
        if (trulyOccupied)                   occupiedBeds++;
        else if (b.status === 'MAINTENANCE') maintenanceBeds++;
        else                                 availableBeds++;
      }
    }

    res.json({
      rooms: formatted.map((r, i) => ({
        ...r,
        beds: rooms[i].beds.map(formatBed)
      })),
      summary: {
        totalRooms, availableRooms, partiallyOccupied, fullRooms, maintenanceRooms,
        totalBeds, occupiedBeds, availableBeds, maintenanceBeds,
      }
    });
  } catch (error) {
    console.error('getRooms error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/rooms/:id
// ---------------------------------------------------------------------------
const getRoomById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid room ID.' });

    const room = await prisma.room.findUnique({ where: { id }, include: ROOM_DETAIL_INCLUDE });
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    const fee = calculateFee(room.sharingType);
    res.json({ ...formatRoom(room), fee, beds: room.beds.map(formatBed) });
  } catch (error) {
    console.error('getRoomById error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/rooms
// ---------------------------------------------------------------------------
const createRoom = async (req, res, next) => {
  try {
    const { roomNumber, floor, sharingType, description } = req.body;

    const errors = [];
    if (!roomNumber || String(roomNumber).trim() === '') errors.push('Room number is required.');
    if (floor === undefined || floor === null || floor === '') errors.push('Floor is required.');
    else if (isNaN(parseInt(floor)) || parseInt(floor) < 0)   errors.push('Floor must be a non-negative number.');
    if (!sharingType) errors.push('Sharing type is required.');
    else if (![1, 2, 3, 4].includes(parseInt(sharingType)))   errors.push('Sharing type must be 1, 2, 3, or 4.');
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' '), errors });

    const sharing = parseInt(sharingType);
    const floorNo = parseInt(floor);

    const existing = await prisma.room.findUnique({ where: { roomNumber: String(roomNumber).trim() } });
    if (existing) return res.status(409).json({ message: `Room number "${roomNumber}" already exists.` });

    const room = await prisma.$transaction(async (tx) => {
      const newRoom = await tx.room.create({
        data: {
          roomNumber:  String(roomNumber).trim(),
          floor:       floorNo,
          sharingType: sharing,
          capacity:    sharing,
          roomType:    `${sharing} Sharing`,
          description: description?.trim() || null,
          status:      'AVAILABLE',
        }
      });
      for (let i = 1; i <= sharing; i++) {
        await tx.bed.create({ data: { roomId: newRoom.id, bedNumber: `Bed ${i}`, status: 'AVAILABLE' } });
      }
      return newRoom;
    });

    const full = await prisma.room.findUnique({ where: { id: room.id }, include: ROOM_DETAIL_INCLUDE });
    res.status(201).json({
      message: 'Room created successfully.',
      room: { ...formatRoom(full), beds: full.beds.map(formatBed), fee: calculateFee(sharing) }
    });
  } catch (error) {
    console.error('createRoom error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/rooms/:id
// ---------------------------------------------------------------------------
const updateRoom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid room ID.' });

    const room = await prisma.room.findUnique({
      where: { id },
      include: { beds: { include: { allocations: { where: { status: 'ACTIVE' } } } } }
    });
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    const { floor, sharingType, description } = req.body;

    const errors = [];
    if (floor       !== undefined && (isNaN(parseInt(floor))       || parseInt(floor) < 0))   errors.push('Floor must be a non-negative number.');
    if (sharingType !== undefined && ![1, 2, 3, 4].includes(parseInt(sharingType)))           errors.push('Sharing type must be 1, 2, 3, or 4.');
    if (errors.length > 0) return res.status(400).json({ message: errors.join(' '), errors });

    const newSharing      = sharingType !== undefined ? parseInt(sharingType) : room.sharingType;
    const currentOccupied = room.beds.filter(b => b.status === 'OCCUPIED').length;

    if (newSharing < currentOccupied) {
      return res.status(400).json({
        message: `Cannot change sharing type to ${newSharing}. Room currently has ${currentOccupied} student(s) allocated. Please deallocate students first.`
      });
    }

    await prisma.$transaction(async (tx) => {
      await tx.room.update({
        where: { id },
        data: {
          floor:       floor       !== undefined ? parseInt(floor)       : room.floor,
          sharingType: newSharing,
          capacity:    newSharing,
          roomType:    `${newSharing} Sharing`,
          description: description !== undefined ? description.trim() || null : room.description,
        }
      });

      if (newSharing !== room.sharingType) {
        if (newSharing > room.sharingType) {
          for (let i = room.sharingType + 1; i <= newSharing; i++) {
            await tx.bed.create({ data: { roomId: id, bedNumber: `Bed ${i}`, status: 'AVAILABLE' } });
          }
        } else {
          const bedsToRemove = room.beds.filter(b => {
            const num = parseInt(b.bedNumber.replace('Bed ', ''));
            return num > newSharing && b.status !== 'OCCUPIED';
          });
          for (const b of bedsToRemove) await tx.bed.delete({ where: { id: b.id } });
        }
      }
    });

    const full = await prisma.room.findUnique({ where: { id }, include: ROOM_DETAIL_INCLUDE });
    res.json({
      message: 'Room updated successfully.',
      room: { ...formatRoom(full), beds: full.beds.map(formatBed), fee: calculateFee(newSharing) }
    });
  } catch (error) {
    console.error('updateRoom error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// DELETE /api/rooms/:id
// ---------------------------------------------------------------------------
const deleteRoom = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).json({ message: 'Invalid room ID.' });

    const room = await prisma.room.findUnique({
      where: { id },
      include: { beds: { include: { allocations: { where: { status: 'ACTIVE' } } } } }
    });
    if (!room) return res.status(404).json({ message: 'Room not found.' });

    const activeCount = room.beds.reduce((sum, b) => sum + b.allocations.length, 0);
    if (activeCount > 0) {
      return res.status(400).json({
        message: `Cannot delete room "${room.roomNumber}". It has ${activeCount} active student allocation(s). Please deallocate all students first.`
      });
    }

    await prisma.room.delete({ where: { id } });
    res.json({ message: `Room "${room.roomNumber}" deleted successfully.` });
  } catch (error) {
    console.error('deleteRoom error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// PATCH /api/rooms/:roomId/beds/:bedId/maintenance
// ---------------------------------------------------------------------------
const updateBedMaintenance = async (req, res, next) => {
  try {
    const roomId = parseInt(req.params.roomId);
    const bedId  = parseInt(req.params.bedId);
    if (isNaN(roomId) || isNaN(bedId)) return res.status(400).json({ message: 'Invalid room or bed ID.' });

    const bed = await prisma.bed.findFirst({
      where: { id: bedId, roomId },
      include: { allocations: { where: { status: 'ACTIVE' } } }
    });
    if (!bed) return res.status(404).json({ message: 'Bed not found in this room.' });

    const { status, maintenanceReason } = req.body;
    if (!['AVAILABLE', 'MAINTENANCE'].includes(status)) {
      return res.status(400).json({ message: 'Status must be AVAILABLE or MAINTENANCE.' });
    }
    if (status === 'MAINTENANCE' && bed.status === 'OCCUPIED') {
      return res.status(400).json({ message: 'Cannot set an occupied bed to maintenance. Deallocate the student first.' });
    }

    const updated = await prisma.bed.update({
      where: { id: bedId },
      data: {
        status,
        maintenanceReason: status === 'MAINTENANCE' ? (maintenanceReason?.trim() || null) : null,
        maintenanceDate:   status === 'MAINTENANCE' ? new Date() : null,
      }
    });

    res.json({
      message: `Bed "${updated.bedNumber}" status updated to ${updated.status}.`,
      bed: {
        id:                updated.id,
        bedNumber:         updated.bedNumber,
        status:            updated.status,
        maintenanceReason: updated.maintenanceReason,
        maintenanceDate:   updated.maintenanceDate,
      }
    });
  } catch (error) {
    console.error('updateBedMaintenance error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/rooms/config
// ---------------------------------------------------------------------------
const getFeeConfig = async (req, res) => {
  res.json({
    base4SharingFee: BASE_4_SHARING_FEE,
    feeTable: [1, 2, 3, 4].map(s => ({
      sharingType: s,
      label:       `${s} Sharing`,
      fee:         calculateFee(s),
    }))
  });
};

// ---------------------------------------------------------------------------
// GET /api/rooms/allocations?status=ACTIVE|VACATED
// ---------------------------------------------------------------------------
const getAllocations = async (req, res, next) => {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status.toUpperCase();
    }

    const allocations = await prisma.allocation.findMany({
      where,
      include: {
        student: { select: { name: true } },
        room: { select: { roomNumber: true, floor: true } },
        bed: { select: { bedNumber: true } }
      },
      orderBy: { allocatedDate: 'desc' }
    });

    res.json({
      allocations: allocations.map(a => ({
        id: a.id,
        studentName: a.student.name,
        roomNumber: a.room.roomNumber,
        floor: a.room.floor,
        bedNumber: a.bed.bedNumber,
        allocatedDate: a.allocatedDate,
        vacatedDate: a.vacatedDate,
        status: a.status
      }))
    });
  } catch (error) {
    console.error('Get allocations error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// GET /api/rooms/students/search?q=...
// ---------------------------------------------------------------------------
const searchStudents = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 1) {
      return res.json({ students: [] });
    }

    const students = await prisma.student.findMany({
      where: {
        user: { isActive: true },
        OR: [
          { name: { contains: q, mode: 'insensitive' } },
          { phone: { contains: q, mode: 'insensitive' } },
          { user: { email: { contains: q, mode: 'insensitive' } } }
        ]
      },
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
      },
      take: 10
    });

    res.json({
      students: students.map(s => {
        const activeAlloc = s.allocations[0] || null;
        return {
          id: s.id,
          name: s.name,
          email: s.user.email,
          hasActiveAllocation: !!activeAlloc,
          currentAllocation: activeAlloc ? {
            roomNumber: activeAlloc.room.roomNumber,
            bedNumber: activeAlloc.bed.bedNumber
          } : null
        };
      })
    });
  } catch (error) {
    console.error('Search students error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// POST /api/rooms/allocate  { studentId, roomId, bedId }
// ---------------------------------------------------------------------------
const allocateBed = async (req, res, next) => {
  try {
    const { studentId, roomId, bedId } = req.body;

    // Validate student exists and has no active allocation
    const student = await prisma.student.findUnique({
      where: { id: studentId },
      include: { allocations: { where: { status: 'ACTIVE' } } }
    });
    if (!student) return res.status(404).json({ message: 'Student not found.' });
    if (student.allocations.length > 0) {
      return res.status(400).json({ message: 'Student already has an active bed allocation.' });
    }

    // Validate bed exists and is available
    const bed = await prisma.bed.findFirst({
      where: { id: bedId, roomId },
      include: { allocations: { where: { status: 'ACTIVE' } } }
    });
    if (!bed) return res.status(404).json({ message: 'Bed not found in this room.' });
    if (bed.status !== 'AVAILABLE') {
      return res.status(400).json({ message: `Bed is currently ${bed.status}.` });
    }

    // Create allocation and update bed status in a transaction
    const allocation = await prisma.$transaction(async (tx) => {
      const alloc = await tx.allocation.create({
        data: { studentId, roomId, bedId, status: 'ACTIVE', allocatedDate: new Date() }
      });
      await tx.bed.update({ where: { id: bedId }, data: { status: 'OCCUPIED' } });
      return alloc;
    });

    res.status(201).json({ message: 'Bed allocated successfully.', allocation });
  } catch (error) {
    console.error('Allocate bed error:', error);
    next(error);
  }
};

// ---------------------------------------------------------------------------
// PUT /api/rooms/allocations/:id/vacate
// ---------------------------------------------------------------------------
const vacateAllocation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const allocation = await prisma.allocation.findUnique({
      where: { id: parseInt(id) }
    });
    if (!allocation) return res.status(404).json({ message: 'Allocation not found.' });
    if (allocation.status !== 'ACTIVE') {
      return res.status(400).json({ message: 'Allocation is not active.' });
    }

    await prisma.$transaction(async (tx) => {
      await tx.allocation.update({
        where: { id: parseInt(id) },
        data: { status: 'VACATED', vacatedDate: new Date() }
      });
      await tx.bed.update({
        where: { id: allocation.bedId },
        data: { status: 'AVAILABLE' }
      });
    });

    res.json({ message: 'Bed vacated successfully.' });
  } catch (error) {
    console.error('Vacate allocation error:', error);
    next(error);
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
  updateBedMaintenance,
  getFeeConfig,
  getAllocations,
  allocateBed,
  searchStudents,
  vacateAllocation,
};
