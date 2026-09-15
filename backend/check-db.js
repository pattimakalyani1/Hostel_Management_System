const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('=== Checking Database ===\n');
  
  // Get all users
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true
    }
  });
  console.log('USERS TABLE:');
  console.log(JSON.stringify(users, null, 2));
  
  // Get all students
  const students = await prisma.student.findMany({
    select: {
      id: true,
      userId: true,
      name: true,
      phone: true,
      address: true
    }
  });
  console.log('\nSTUDENTS TABLE:');
  console.log(JSON.stringify(students, null, 2));
  
  console.log('\n=== Summary ===');
  console.log(`Total Users: ${users.length}`);
  console.log(`Total Students: ${students.length}`);
  console.log(`Wardens: ${users.filter(u => u.role === 'WARDEN').length}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
