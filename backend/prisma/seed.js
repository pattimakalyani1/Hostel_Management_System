const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

async function main() {
  console.log('Starting database seed...');
  
  // Get admin credentials from environment variables
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@hostel.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'change_this_password';
  
  console.log(`Creating/updating default Warden account: ${adminEmail}`);
  
  // Hash the password
  const hashedPassword = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  
  // Check if admin already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail.toLowerCase() }
  });
  
  if (existingAdmin) {
    // Update existing admin
    await prisma.user.update({
      where: { email: adminEmail.toLowerCase() },
      data: {
        password: hashedPassword,
        role: 'WARDEN',
        isActive: true
      }
    });
    console.log('Default Warden account updated successfully.');
  } else {
    // Create new admin
    await prisma.user.create({
      data: {
        email: adminEmail.toLowerCase(),
        password: hashedPassword,
        role: 'WARDEN',
        isActive: true
      }
    });
    console.log('Default Warden account created successfully.');
  }
  
  // ---------------------------------------------------------------------------
  // Room Allocation module sample data (idempotent)
  // Seeds a few rooms with beds and a demo student so the Room Allocation
  // module can be exercised. Existing rooms/students are left untouched.
  // ---------------------------------------------------------------------------
  console.log('\nSeeding sample rooms and beds for Room Allocation...');

  const sampleRooms = [
    { roomNumber: '101', floor: 1, capacity: 4, roomType: 'Standard', beds: ['B1', 'B2', 'B3', 'B4'] },
    { roomNumber: '102', floor: 1, capacity: 2, roomType: 'Deluxe', beds: ['B1', 'B2'] },
    { roomNumber: '204', floor: 2, capacity: 4, roomType: 'Standard', beds: ['B1', 'B2', 'B3', 'B4'] },
    { roomNumber: '305', floor: 3, capacity: 3, roomType: 'Standard', beds: ['B1', 'B2', 'B3'] }
  ];

  for (const roomData of sampleRooms) {
    const room = await prisma.room.upsert({
      where: { roomNumber: roomData.roomNumber },
      update: {},
      create: {
        roomNumber: roomData.roomNumber,
        floor: roomData.floor,
        capacity: roomData.capacity,
        roomType: roomData.roomType,
        status: 'ACTIVE'
      }
    });

    for (const bedNumber of roomData.beds) {
      // @@unique([roomId, bedNumber]) lets us upsert safely without duplicates
      await prisma.bed.upsert({
        where: { roomId_bedNumber: { roomId: room.id, bedNumber } },
        update: {},
        create: { roomId: room.id, bedNumber, status: 'AVAILABLE' }
      });
    }
  }

  // Mark one bed in room 101 as under maintenance for demo purposes
  const room101 = await prisma.room.findUnique({ where: { roomNumber: '101' } });
  if (room101) {
    const maintenanceBed = await prisma.bed.findFirst({
      where: { roomId: room101.id, bedNumber: 'B4', status: 'AVAILABLE' }
    });
    if (maintenanceBed) {
      await prisma.bed.update({ where: { id: maintenanceBed.id }, data: { status: 'MAINTENANCE' } });
    }
  }

  console.log('Sample rooms and beds seeded.');

  // Demo student "Ananya" (matches the acceptance-test scenario)
  const demoStudentEmail = 'ananya@hostel.com';
  const demoStudentPassword = 'Student@123';
  let demoUser = await prisma.user.findUnique({ where: { email: demoStudentEmail } });
  if (!demoUser) {
    const hashedStudentPassword = await bcrypt.hash(demoStudentPassword, SALT_ROUNDS);
    demoUser = await prisma.user.create({
      data: {
        email: demoStudentEmail,
        password: hashedStudentPassword,
        role: 'STUDENT',
        isActive: true,
        student: {
          create: {
            name: 'Ananya',
            phone: '9876543210',
            course: 'Computer Science',
            year: 2,
            address: '123 Campus Road'
          }
        }
      }
    });
    console.log(`Demo student created: ${demoStudentEmail} / ${demoStudentPassword}`);
  } else {
    console.log(`Demo student already exists: ${demoStudentEmail}`);
  }

  console.log('\n=================================');
  console.log('Seed completed!');
  console.log('=================================');
  console.log(`Warden Email: ${adminEmail}`);
  console.log('Warden Password: (as set in ADMIN_PASSWORD env variable)');
  console.log(`Demo Student Email: ${demoStudentEmail}`);
  console.log(`Demo Student Password: ${demoStudentPassword}`);
  console.log('=================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
