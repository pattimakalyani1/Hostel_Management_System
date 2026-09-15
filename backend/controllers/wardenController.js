const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Get warden dashboard data
 * GET /api/warden/dashboard
 */
const getDashboard = async (req, res, next) => {
  try {
    // Get user details
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        createdAt: true
      }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }
    
    // Get summary statistics
    const [
      totalStudents,
      totalRooms,
      pendingFeesCount,
      openComplaintsCount,
      pendingOutpassCount,
      occupiedBeds,
      totalBeds
    ] = await Promise.all([
      // Total active students
      prisma.student.count({
        where: {
          user: {
            isActive: true
          }
        }
      }),
      // Total rooms
      prisma.room.count(),
      // Pending/Overdue fees
      prisma.fee.count({
        where: {
          status: {
            in: ['PENDING', 'PARTIAL', 'OVERDUE']
          }
        }
      }),
      // Open complaints
      prisma.complaint.count({
        where: {
          status: {
            in: ['OPEN', 'IN_PROGRESS']
          }
        }
      }),
      // Pending outpasses
      prisma.outpass.count({
        where: {
          status: 'PENDING'
        }
      }),
      // Occupied beds
      prisma.bed.count({
        where: {
          status: 'OCCUPIED'
        }
      }),
      // Total beds
      prisma.bed.count()
    ]);
    
    // Calculate occupancy rate
    const occupancyRate = totalBeds > 0 
      ? Math.round((occupiedBeds / totalBeds) * 100) 
      : 0;
    
    // Prepare dashboard data
    const dashboardData = {
      warden: {
        id: user.id,
        email: user.email,
        role: 'Warden / Admin',
        memberSince: user.createdAt
      },
      summary: {
        totalStudents,
        totalRooms,
        pendingFeesCount,
        openComplaintsCount,
        pendingOutpassCount,
        totalBeds,
        occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        occupancyRate
      }
    };
    
    res.json(dashboardData);
  } catch (error) {
    console.error('Warden dashboard error:', error);
    next(error);
  }
};

module.exports = {
  getDashboard
};
