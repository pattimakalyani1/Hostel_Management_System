const prisma = require('../utils/prisma');

/**
 * Get student profile
 * GET /api/student/profile
 */
const getProfile = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: {
          select: {
            email: true,
            createdAt: true,
            isActive: true
          }
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    res.json({
      id: student.id,
      name: student.name,
      email: student.user.email,
      phone: student.phone,
      course: student.course,
      year: student.year,
      address: student.address,
      isActive: student.user.isActive,
      memberSince: student.user.createdAt,
      updatedAt: student.updatedAt
    });
  } catch (error) {
    console.error('Get profile error:', error);
    next(error);
  }
};

/**
 * Update student profile
 * PUT /api/student/profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, course, year, address } = req.body;

    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const updatedStudent = await prisma.student.update({
      where: { id: student.id },
      data: {
        name: name || student.name,
        phone: phone !== undefined ? phone : student.phone,
        course: course !== undefined ? course : student.course,
        year: year !== undefined ? (year ? parseInt(year) : null) : student.year,
        address: address !== undefined ? address : student.address
      },
      include: {
        user: {
          select: {
            email: true,
            createdAt: true
          }
        }
      }
    });

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: updatedStudent.id,
        name: updatedStudent.name,
        email: updatedStudent.user.email,
        phone: updatedStudent.phone,
        course: updatedStudent.course,
        year: updatedStudent.year,
        address: updatedStudent.address,
        memberSince: updatedStudent.user.createdAt
      }
    });
  } catch (error) {
    console.error('Update profile error:', error);
    next(error);
  }
};

/**
 * Get student room allocation
 * GET /api/student/room
 */
const getRoom = async (req, res, next) => {
  try {
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      include: {
        allocations: {
          where: { status: 'ACTIVE' },
          include: {
            room: {
              include: {
                beds: {
                  select: {
                    id: true,
                    bedNumber: true,
                    status: true
                  }
                }
              }
            },
            bed: true
          },
          orderBy: { allocatedDate: 'desc' },
          take: 1
        }
      }
    });

    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }

    const allocation = student.allocations[0];

    if (!allocation) {
      return res.json({
        allocated: false,
        message: 'No room allocated yet. Please contact the warden.',
        room: null
      });
    }

    // Count roommates (other students in same room)
    const roommates = await prisma.allocation.findMany({
      where: {
        roomId: allocation.roomId,
        status: 'ACTIVE',
        studentId: { not: student.id }
      },
      include: {
        student: {
          select: {
            name: true,
            course: true,
            year: true
          }
        },
        bed: {
          select: {
            bedNumber: true
          }
        }
      }
    });

    res.json({
      allocated: true,
      room: {
        id: allocation.room.id,
        roomNumber: allocation.room.roomNumber,
        floor: allocation.room.floor,
        capacity: allocation.room.capacity,
        roomType: allocation.room.roomType,
        status: allocation.room.status
      },
      bed: {
        id: allocation.bed.id,
        bedNumber: allocation.bed.bedNumber,
        status: allocation.bed.status
      },
      allocation: {
        id: allocation.id,
        allocatedDate: allocation.allocatedDate,
        status: allocation.status
      },
      roommates: roommates.map(r => ({
        name: r.student.name,
        course: r.student.course,
        year: r.student.year,
        bedNumber: r.bed.bedNumber
      }))
    });
  } catch (error) {
    console.error('Get room error:', error);
    next(error);
  }
};

/**
 * Get student dashboard data
 * GET /api/student/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    // Get student from authenticated user (never trust frontend-provided studentId)
    const student = await prisma.student.findUnique({
      where: { userId: req.user.userId },
      include: {
        user: {
          select: {
            email: true,
            createdAt: true
          }
        },
        allocations: {
          where: { status: 'ACTIVE' },
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
                bedNumber: true,
                status: true
              }
            }
          },
          take: 1
        },
        fees: {
          where: {
            status: {
              in: ['PENDING', 'PARTIAL', 'OVERDUE']
            }
          },
          select: {
            id: true,
            amount: true,
            status: true,
            dueDate: true
          }
        },
        complaints: {
          where: {
            status: {
              in: ['OPEN', 'IN_PROGRESS']
            }
          },
          select: {
            id: true,
            status: true
          }
        },
        outpasses: {
          where: {
            status: 'PENDING'
          },
          select: {
            id: true
          }
        }
      }
    });
    
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found.' });
    }
    
    // Get current room allocation
    const currentAllocation = student.allocations[0] || null;
    
    // Calculate pending fees total
    const pendingFeesTotal = student.fees.reduce((sum, fee) => {
      return sum + parseFloat(fee.amount);
    }, 0);
    
    // Prepare dashboard data
    const dashboardData = {
      student: {
        id: student.id,
        name: student.name,
        email: student.user.email,
        phone: student.phone,
        course: student.course,
        year: student.year,
        memberSince: student.user.createdAt
      },
      room: currentAllocation ? {
        allocationId: currentAllocation.id,
        roomNumber: currentAllocation.room.roomNumber,
        floor: currentAllocation.room.floor,
        roomType: currentAllocation.room.roomType,
        bedNumber: currentAllocation.bed.bedNumber,
        bedStatus: currentAllocation.bed.status,
        status: currentAllocation.status,
        allocatedDate: currentAllocation.allocatedDate
      } : null,
      summary: {
        hasRoom: !!currentAllocation,
        pendingFeesCount: student.fees.length,
        pendingFeesTotal: pendingFeesTotal,
        openComplaintsCount: student.complaints.length,
        pendingOutpassCount: student.outpasses.length
      }
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Student dashboard error:', error);
    next(error);
  }
};

module.exports = {
  getDashboard,
  getProfile,
  updateProfile,
  getRoom
};
