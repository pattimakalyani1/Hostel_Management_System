const prisma = require('../utils/prisma');

/**
 * Get all students with details
 * GET /api/warden/students
 * Query params: search, course, year, status (active/inactive), page, limit
 */
const getAllStudents = async (req, res, next) => {
  try {
    const { search, course, year, status, page = 1, limit = 20 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Build filter conditions
    const where = {
      user: {}
    };

    // Filter by active status
    if (status === 'active') {
      where.user.isActive = true;
    } else if (status === 'inactive') {
      where.user.isActive = false;
    }

    // Filter by course
    if (course) {
      where.course = { contains: course, mode: 'insensitive' };
    }

    // Filter by year
    if (year) {
      where.year = parseInt(year);
    }

    // Search by name, email, or phone
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { user: { email: { contains: search, mode: 'insensitive' } } }
      ];
      // When using OR with nested user filter, restructure
      if (where.user.isActive !== undefined) {
        where.OR = where.OR.map(condition => {
          if (condition.user) {
            return { user: { ...condition.user, isActive: where.user.isActive } };
          }
          return { ...condition, user: { isActive: where.user.isActive } };
        });
        delete where.user;
      }
    }

    // Clean up empty user filter
    if (where.user && Object.keys(where.user).length === 0) {
      delete where.user;
    }

    const [students, totalCount] = await Promise.all([
      prisma.student.findMany({
        where,
        include: {
          user: {
            select: {
              email: true,
              isActive: true,
              createdAt: true
            }
          },
          allocations: {
            where: { status: 'ACTIVE' },
            include: {
              room: {
                select: {
                  roomNumber: true,
                  floor: true
                }
              },
              bed: {
                select: {
                  bedNumber: true
                }
              }
            },
            take: 1
          }
        },
        orderBy: { name: 'asc' },
        skip,
        take: parseInt(limit)
      }),
      prisma.student.count({ where })
    ]);

    // Format response
    const formattedStudents = students.map(student => {
      const allocation = student.allocations[0] || null;
      return {
        id: student.id,
        name: student.name,
        email: student.user.email,
        phone: student.phone || '--',
        course: student.course || '--',
        year: student.year || '--',
        address: student.address || '--',
        isActive: student.user.isActive,
        joinedAt: student.user.createdAt,
        room: allocation ? {
          roomNumber: allocation.room.roomNumber,
          floor: allocation.room.floor,
          bedNumber: allocation.bed.bedNumber
        } : null
      };
    });

    res.json({
      students: formattedStudents,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(totalCount / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get all students error:', error);
    next(error);
  }
};

/**
 * Get student by ID with full details
 * GET /api/warden/students/:id
 */
const getStudentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: {
        user: {
          select: {
            email: true,
            isActive: true,
            createdAt: true
          }
        },
        allocations: {
          include: {
            room: {
              select: {
                roomNumber: true,
                floor: true,
                roomType: true
              }
            },
            bed: {
              select: {
                bedNumber: true
              }
            }
          },
          orderBy: { allocatedDate: 'desc' }
        },
        complaints: {
          select: {
            id: true,
            title: true,
            category: true,
            status: true,
            createdAt: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        },
        fees: {
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true,
            description: true
          },
          orderBy: { dueDate: 'desc' },
          take: 5
        },
        outpasses: {
          select: {
            id: true,
            reason: true,
            status: true,
            destination: true,
            leavingTime: true,
            expectedReturnTime: true
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    const activeAllocation = student.allocations.find(a => a.status === 'ACTIVE') || null;

    res.json({
      student: {
        id: student.id,
        name: student.name,
        email: student.user.email,
        phone: student.phone || '--',
        course: student.course || '--',
        year: student.year || '--',
        address: student.address || '--',
        isActive: student.user.isActive,
        joinedAt: student.user.createdAt,
        room: activeAllocation ? {
          roomNumber: activeAllocation.room.roomNumber,
          floor: activeAllocation.room.floor,
          roomType: activeAllocation.room.roomType,
          bedNumber: activeAllocation.bed.bedNumber
        } : null,
        recentComplaints: student.complaints,
        recentFees: student.fees,
        recentOutpasses: student.outpasses,
        allocationHistory: student.allocations.map(a => ({
          roomNumber: a.room.roomNumber,
          bedNumber: a.bed.bedNumber,
          floor: a.room.floor,
          status: a.status,
          allocatedDate: a.allocatedDate,
          vacatedDate: a.vacatedDate
        }))
      }
    });
  } catch (error) {
    console.error('Get student by ID error:', error);
    next(error);
  }
};

/**
 * Delete a student
 * DELETE /api/warden/students/:id
 */
const deleteStudent = async (req, res, next) => {
  try {
    const { id } = req.params;

    const student = await prisma.student.findUnique({
      where: { id: parseInt(id) },
      include: { user: { select: { id: true } } }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student not found.' });
    }

    // Delete user (cascades to student profile due to onDelete: Cascade)
    await prisma.user.delete({
      where: { id: student.user.id }
    });

    res.json({ message: 'Student deleted successfully.' });
  } catch (error) {
    console.error('Delete student error:', error);
    next(error);
  }
};

module.exports = {
  getAllStudents,
  getStudentById,
  deleteStudent
};
