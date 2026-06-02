require('dotenv').config();
const bcrypt = require('bcryptjs');
const prisma = require('../config/database');

async function seed() {
  console.log('🌱 Seeding database...');

  // Create admin user
  const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin@123456', 12);

  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@consultaplaca.com' },
    update: {},
    create: {
      name: 'Administrador',
      email: process.env.ADMIN_EMAIL || 'admin@consultaplaca.com',
      password: adminPassword,
      role: 'ADMIN',
      consultasLimit: 99999,
    },
  });

  console.log(`✅ Admin created: ${admin.email}`);

  // Create demo user
  const demoPassword = await bcrypt.hash('Demo@123456', 12);

  const demo = await prisma.user.upsert({
    where: { email: 'demo@consultaplaca.com' },
    update: {},
    create: {
      name: 'Usuário Demo',
      email: 'demo@consultaplaca.com',
      password: demoPassword,
      role: 'USER',
      consultasLimit: 50,
    },
  });

  console.log(`✅ Demo user created: ${demo.email}`);
  console.log('\n📋 Credentials:');
  console.log(`   Admin: ${admin.email} / ${process.env.ADMIN_PASSWORD || 'Admin@123456'}`);
  console.log(`   Demo:  demo@consultaplaca.com / Demo@123456`);
  console.log('\n✨ Seed completed!');
}

seed()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
