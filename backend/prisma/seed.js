const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const prisma = new PrismaClient();

const SALT_ROUNDS = 12;

// ---------------------------------------------------------------------------
// Fee helper – single source of truth (mirrors roomController logic)
// ---------------------------------------------------------------------------
const BASE_4_SHARING_FEE = 5000;
function calculateFee(sharingType) {
  return BASE_4_SHARING_FEE + (4 - sharingType) * 500;
}

async function main() {
  console.log('Starting database seed...');

  // ── 1. Warden account ──────────────────────────────────────────────────
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@hostel.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123';
  console.log(`Creating/updating default Warden account: ${adminEmail}`);

  const hashedAdminPw = await bcrypt.hash(adminPassword, SALT_ROUNDS);
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail.toLowerCase() } });

  if (existingAdmin) {
    await prisma.user.update({
      where: { email: adminEmail.toLowerCase() },
      data: { password: hashedAdminPw, role: 'WARDEN', isActive: true }
    });
    console.log('Default Warden account updated.');
  } else {
    await prisma.user.create({
      data: { email: adminEmail.toLowerCase(), password: hashedAdminPw, role: 'WARDEN', isActive: true }
    });
    console.log('Default Warden account created.');
  }

  // ── 2. Student users & profiles ────────────────────────────────────────
  const studentPassword = await bcrypt.hash('Student@123', SALT_ROUNDS);

  const studentsData = [
    { email: 'rahul@hostel.com',   name: 'Rahul Sharma',   phone: '9876543210', course: 'B.Tech CSE',   year: 2 },
    { email: 'anjali@hostel.com',  name: 'Anjali Gupta',   phone: '9876543211', course: 'B.Tech ECE',   year: 1 },
    { email: 'suresh@hostel.com',  name: 'Suresh Kumar',   phone: '9876543212', course: 'B.Tech ME',    year: 3 },
    { email: 'priya@hostel.com',   name: 'Priya Singh',    phone: '9876543213', course: 'B.Tech Civil', year: 2 },
    { email: 'arun@hostel.com',    name: 'Arun Patel',     phone: '9876543214', course: 'MCA',          year: 1 },
    { email: 'meena@hostel.com',   name: 'Meena Reddy',    phone: '9876543215', course: 'MBA',          year: 2 },
    { email: 'vikram@hostel.com',  name: 'Vikram Joshi',   phone: '9876543216', course: 'B.Tech IT',    year: 4 },
    { email: 'deepa@hostel.com',   name: 'Deepa Nair',     phone: '9876543217', course: 'B.Sc Physics', year: 3 },
    { email: 'karthik@hostel.com', name: 'Karthik Menon',  phone: '9876543218', course: 'B.Tech CSE',   year: 1 },
    { email: 'rohit@hostel.com',   name: 'Rohit Verma',    phone: '9876543219', course: 'B.Tech ECE',   year: 2 },
    { email: 'sneha@hostel.com',   name: 'Sneha Pillai',   phone: '9876543220', course: 'B.Tech IT',    year: 3 },
    // Demo student from room-backup branch (outpass/complaints testing)
    { email: 'ananya@hostel.com',  name: 'Ananya',         phone: '9876543221', course: 'Computer Science', year: 2 },
  ];

  const students = [];
  for (const s of studentsData) {
    let userRecord = await prisma.user.findUnique({ where: { email: s.email } });
    if (!userRecord) {
      userRecord = await prisma.user.create({
        data: { email: s.email, password: studentPassword, role: 'STUDENT', isActive: true }
      });
    }
    let studentRecord = await prisma.student.findUnique({ where: { userId: userRecord.id } });
    if (!studentRecord) {
      studentRecord = await prisma.student.create({
        data: {
          userId: userRecord.id,
          name:   s.name,
          phone:  s.phone,
          course: s.course,
          year:   s.year,
        }
      });
    }
    students.push(studentRecord);
  }
  console.log(`Ensured ${students.length} student accounts.`);

  // Helper: find student by name fragment
  const stu = (name) => students.find(s => s.name.startsWith(name));

  // ── 3. Rooms ───────────────────────────────────────────────────────────
  // Wipe existing allocations, beds, rooms so seed is idempotent
  await prisma.allocation.deleteMany({});
  await prisma.bed.deleteMany({});
  await prisma.room.deleteMany({});

  const roomDefs = [
    // Floor 1
    { roomNumber: '101', floor: 1, sharingType: 4, description: 'Standard 4-sharing room, ground floor east wing' },
    { roomNumber: '102', floor: 1, sharingType: 3, description: 'Standard 3-sharing room, ground floor east wing' },
    { roomNumber: '103', floor: 1, sharingType: 2, description: 'Standard 2-sharing room, ground floor west wing' },
    { roomNumber: '104', floor: 1, sharingType: 1, description: 'Single occupancy room, ground floor west wing' },
    // Floor 2
    { roomNumber: '201', floor: 2, sharingType: 4, description: 'Standard 4-sharing room, first floor east wing' },
    { roomNumber: '202', floor: 2, sharingType: 2, description: 'Standard 2-sharing room, first floor west wing' },
    // Floor 3
    { roomNumber: '301', floor: 3, sharingType: 4, description: 'Standard 4-sharing room, second floor – vacant' },
  ];

  const createdRooms = {};
  for (const rd of roomDefs) {
    const room = await prisma.room.create({
      data: {
        roomNumber:  rd.roomNumber,
        floor:       rd.floor,
        sharingType: rd.sharingType,
        capacity:    rd.sharingType,
        description: rd.description,
        roomType:    `${rd.sharingType} Sharing`,
        status:      'AVAILABLE',
      }
    });
    createdRooms[rd.roomNumber] = room;
  }
  console.log(`Created ${Object.keys(createdRooms).length} rooms.`);

  // ── 4. Beds ────────────────────────────────────────────────────────────
  async function createBeds(room, bedConfigs) {
    const beds = [];
    for (const bc of bedConfigs) {
      const bed = await prisma.bed.create({
        data: {
          roomId:            room.id,
          bedNumber:         bc.number,
          status:            bc.status || 'AVAILABLE',
          maintenanceReason: bc.maintenanceReason || null,
          maintenanceDate:   bc.maintenanceDate   || null,
        }
      });
      beds.push(bed);
    }
    return beds;
  }

  // Room 101: 4-sharing, fully occupied
  const beds101 = await createBeds(createdRooms['101'], [
    { number: 'Bed 1', status: 'OCCUPIED' },
    { number: 'Bed 2', status: 'OCCUPIED' },
    { number: 'Bed 3', status: 'OCCUPIED' },
    { number: 'Bed 4', status: 'OCCUPIED' },
  ]);

  // Room 102: 3-sharing, 2 occupied + 1 available
  const beds102 = await createBeds(createdRooms['102'], [
    { number: 'Bed 1', status: 'OCCUPIED' },
    { number: 'Bed 2', status: 'OCCUPIED' },
    { number: 'Bed 3', status: 'AVAILABLE' },
  ]);

  // Room 103: 2-sharing, 1 occupied + 1 maintenance
  const beds103 = await createBeds(createdRooms['103'], [
    { number: 'Bed 1', status: 'OCCUPIED' },
    { number: 'Bed 2', status: 'MAINTENANCE', maintenanceReason: 'Bed frame repair needed', maintenanceDate: new Date() },
  ]);

  // Room 104: 1-sharing, 1 occupied
  const beds104 = await createBeds(createdRooms['104'], [
    { number: 'Bed 1', status: 'OCCUPIED' },
  ]);

  // Room 201: 4-sharing, 3 occupied + 1 maintenance
  const beds201 = await createBeds(createdRooms['201'], [
    { number: 'Bed 1', status: 'OCCUPIED' },
    { number: 'Bed 2', status: 'OCCUPIED' },
    { number: 'Bed 3', status: 'OCCUPIED' },
    { number: 'Bed 4', status: 'MAINTENANCE', maintenanceReason: 'Mattress replacement', maintenanceDate: new Date() },
  ]);

  // Room 202: 2-sharing, fully available
  await createBeds(createdRooms['202'], [
    { number: 'Bed 1', status: 'AVAILABLE' },
    { number: 'Bed 2', status: 'AVAILABLE' },
  ]);

  // Room 301: 4-sharing, completely vacant
  await createBeds(createdRooms['301'], [
    { number: 'Bed 1', status: 'AVAILABLE' },
    { number: 'Bed 2', status: 'AVAILABLE' },
    { number: 'Bed 3', status: 'AVAILABLE' },
    { number: 'Bed 4', status: 'AVAILABLE' },
  ]);

  console.log('Beds created for all rooms.');

  // ── 5. Allocations ─────────────────────────────────────────────────────
  const allocations = [
    // Room 101 – 4 sharing – ₹5,000
    { student: stu('Rahul'),   room: createdRooms['101'], bed: beds101[0] },
    { student: stu('Anjali'),  room: createdRooms['101'], bed: beds101[1] },
    { student: stu('Suresh'),  room: createdRooms['101'], bed: beds101[2] },
    { student: stu('Priya'),   room: createdRooms['101'], bed: beds101[3] },
    // Room 102 – 3 sharing – ₹5,500
    { student: stu('Arun'),    room: createdRooms['102'], bed: beds102[0] },
    { student: stu('Meena'),   room: createdRooms['102'], bed: beds102[1] },
    // Room 103 – 2 sharing – ₹6,000 (Bed 2 maintenance)
    { student: stu('Vikram'),  room: createdRooms['103'], bed: beds103[0] },
    // Room 104 – 1 sharing – ₹6,500
    { student: stu('Deepa'),   room: createdRooms['104'], bed: beds104[0] },
    // Room 201 – 4 sharing – ₹5,000 (Bed 4 maintenance, 3 students on Beds 1-3)
    { student: stu('Karthik'), room: createdRooms['201'], bed: beds201[0] },
    { student: stu('Rohit'),   room: createdRooms['201'], bed: beds201[1] },
    { student: stu('Sneha'),   room: createdRooms['201'], bed: beds201[2] },
    // Ananya (from room-backup, unallocated – available for outpass/complaints testing)
  ];

  for (const alloc of allocations) {
    if (!alloc.student) { console.warn('Student not found for allocation, skipping.'); continue; }
    await prisma.allocation.create({
      data: {
        studentId:     alloc.student.id,
        roomId:        alloc.room.id,
        bedId:         alloc.bed.id,
        status:        'ACTIVE',
        allocatedDate: new Date()
      }
    });
  }
  console.log(`Created ${allocations.length} allocations.`);

  console.log('\n=================================');
  console.log('Seed completed!');
  console.log('=================================');
  console.log(`Warden  Email   : ${adminEmail}`);
  console.log(`Warden  Password: ${adminPassword}`);
  console.log('Student Password: Student@123  (all students)');
  console.log('=================================');
  console.log('\nRoom summary:');
  console.log('  101 – 4 Sharing – FULL          – Fee ₹5,000  (Rahul, Anjali, Suresh, Priya)');
  console.log('  102 – 3 Sharing – PARTIALLY OCC – Fee ₹5,500  (Arun, Meena | Bed 3 available)');
  console.log('  103 – 2 Sharing – PARTIALLY OCC – Fee ₹6,000  (Vikram | Bed 2 maintenance)');
  console.log('  104 – 1 Sharing – FULL          – Fee ₹6,500  (Deepa)');
  console.log('  201 – 4 Sharing – PARTIALLY OCC – Fee ₹5,000  (Karthik, Rohit, Sneha | Bed 4 maintenance)');
  console.log('  202 – 2 Sharing – AVAILABLE     – Fee ₹6,000');
  console.log('  301 – 4 Sharing – AVAILABLE     – Fee ₹5,000');
  console.log('\nDemo student: ananya@hostel.com / Student@123 (unallocated, for outpass/complaints testing)');
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
