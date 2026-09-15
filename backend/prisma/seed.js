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
  
  console.log('\n=================================');
  console.log('Seed completed!');
  console.log('=================================');
  console.log(`Warden Email: ${adminEmail}`);
  console.log('Warden Password: (as set in ADMIN_PASSWORD env variable)');
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
