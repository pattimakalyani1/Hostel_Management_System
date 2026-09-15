const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

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
        roomNumber: currentAllocation.room.roomNumber,
        floor: currentAllocation.room.floor,
        bedNumber: currentAllocation.bed.bedNumber,
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
  getDashboard
};
