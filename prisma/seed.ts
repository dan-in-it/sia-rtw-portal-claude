import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create categories
  console.log('📁 Creating categories...');
  const categories = [
    {
      name: 'Temporary Work Restrictions',
      description: 'Questions about temporary restrictions and accommodations',
      icon: '⏰',
      sortOrder: 1,
    },
    {
      name: 'Permanent Work Restrictions',
      description: 'Discussions on permanent restrictions and long-term accommodations',
      icon: '📋',
      sortOrder: 2,
    },
    {
      name: 'Industrial Cases',
      description: 'Work-related injury cases and workers\' compensation',
      icon: '🏭',
      sortOrder: 3,
    },
    {
      name: 'Non-Industrial Cases',
      description: 'Non-work-related medical conditions and accommodations',
      icon: '🏥',
      sortOrder: 4,
    },
    {
      name: 'Bridge Assignments',
      description: 'Temporary alternative work assignments',
      icon: '🌉',
      sortOrder: 5,
    },
    {
      name: 'ADA/FEHA Compliance',
      description: 'Legal compliance questions and guidance',
      icon: '⚖️',
      sortOrder: 6,
    },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { name: category.name },
      update: {},
      create: category,
    });
  }
  console.log(`✅ Created ${categories.length} categories`);

  // Create default tags
  console.log('🏷️  Creating tags...');
  const tags = [
    { name: 'urgent', color: '#ef4444' },
    { name: 'resolved', color: '#10b981' },
    { name: 'ongoing', color: '#f59e0b' },
    { name: 'ada', color: '#3b82f6' },
    { name: 'feha', color: '#6366f1' },
    { name: 'workers-comp', color: '#8b5cf6' },
  ];

  for (const tag of tags) {
    await prisma.tag.upsert({
      where: { name: tag.name },
      update: {},
      create: tag,
    });
  }
  console.log(`✅ Created ${tags.length} tags`);

  // Create admin user
  console.log('👤 Creating admin user...');
  const adminPassword = await bcrypt.hash('admin123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@sia.gov' },
    update: {},
    create: {
      email: 'admin@sia.gov',
      passwordHash: adminPassword,
      fullName: 'System Administrator',
      role: UserRole.ADMIN,
      department: 'IT',
      isActive: true,
    },
  });
  console.log(`✅ Created admin user: ${admin.email}`);

  // Create RTW Liaison user
  console.log('👤 Creating RTW Liaison user...');
  const liaisonPassword = await bcrypt.hash('liaison123', 12);

  const liaison = await prisma.user.upsert({
    where: { email: 'rtw.liaison@sia.gov' },
    update: {},
    create: {
      email: 'rtw.liaison@sia.gov',
      passwordHash: liaisonPassword,
      fullName: 'RTW Liaison',
      role: UserRole.LIAISON,
      department: 'Safety Division',
      isActive: true,
    },
  });
  console.log(`✅ Created RTW Liaison user: ${liaison.email}`);

  // Create Legal Counsel user
  console.log('👤 Creating Legal Counsel user...');
  const legalPassword = await bcrypt.hash('legal123', 12);

  const legal = await prisma.user.upsert({
    where: { email: 'legal@sia.gov' },
    update: {},
    create: {
      email: 'legal@sia.gov',
      passwordHash: legalPassword,
      fullName: 'Legal Counsel',
      role: UserRole.LEGAL,
      department: 'Legal',
      isActive: true,
    },
  });
  console.log(`✅ Created Legal Counsel user: ${legal.email}`);

  // Create sample SD member
  console.log('👤 Creating sample SD member...');
  const memberPassword = await bcrypt.hash('member123', 12);

  const member = await prisma.user.upsert({
    where: { email: 'member@sia.gov' },
    update: {},
    create: {
      email: 'member@sia.gov',
      passwordHash: memberPassword,
      fullName: 'John Doe',
      role: UserRole.MEMBER,
      department: 'Safety Division',
      isActive: true,
    },
  });
  console.log(`✅ Created sample member: ${member.email}`);

  // Create sample training document
  console.log('📚 Creating sample training documents...');
  const adaCategory = await prisma.category.findFirst({
    where: { name: 'ADA/FEHA Compliance' },
  });

  if (adaCategory) {
    await prisma.trainingDocument.create({
      data: {
        title: 'ADA Reasonable Accommodation Guidelines',
        content: `The Americans with Disabilities Act (ADA) requires employers to provide reasonable accommodations to qualified individuals with disabilities, unless doing so would cause undue hardship.

Key Points:
1. Interactive Process: Employers must engage in an interactive process with the employee to determine appropriate accommodations.
2. Reasonable Accommodations may include:
   - Modified work schedules
   - Restructuring jobs
   - Reassignment to vacant positions
   - Acquisition of equipment or devices
   - Adjusting policies and procedures

3. Undue Hardship: Accommodation is not required if it would cause significant difficulty or expense relative to the employer's size, resources, and operations.

4. Medical Documentation: Employers may request medical documentation to verify the disability and need for accommodation.

5. Confidentiality: Medical information must be kept confidential and stored separately from personnel files.`,
        documentType: 'COMPLIANCE',
        uploadedById: admin.id,
        isActive: true,
      },
    });

    await prisma.trainingDocument.create({
      data: {
        title: 'FEHA Work Restriction Guidelines',
        content: `The California Fair Employment and Housing Act (FEHA) provides broader protections than the ADA and applies to employers with 5 or more employees.

Key Differences from ADA:
1. Broader Definition: FEHA defines disability more broadly than the ADA.
2. Temporary Disabilities: FEHA may cover temporary disabilities lasting more than 6 months.
3. Medical Condition: FEHA protects against discrimination based on medical condition (cancer and genetic characteristics).

Best Practices:
- Always consider FEHA requirements in addition to ADA
- Temporary work restrictions should be evaluated under FEHA
- Document all accommodation discussions
- Maintain open communication with employees
- Consult legal counsel for complex cases`,
        documentType: 'COMPLIANCE',
        uploadedById: admin.id,
        isActive: true,
      },
    });
  }

  console.log('✅ Created sample training documents');

  console.log('\n🎉 Database seeding completed successfully!\n');
  console.log('📝 Default login credentials:');
  console.log('   Admin: admin@sia.gov / admin123');
  console.log('   RTW Liaison: rtw.liaison@sia.gov / liaison123');
  console.log('   Legal Counsel: legal@sia.gov / legal123');
  console.log('   Sample Member: member@sia.gov / member123');
  console.log('\n⚠️  IMPORTANT: Change these passwords immediately in production!\n');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
