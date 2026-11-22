import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seed() {
  const university = await prisma.university.upsert({
    where: { slug: 'university-of-kabianga' },
    update: { name: 'University of Kabianga', country: 'Kenya', active: true },
    create: { slug: 'university-of-kabianga', name: 'University of Kabianga', country: 'Kenya' },
  });
  await prisma.campus.upsert({
    where: { universityId_name: { universityId: university.id, name: 'Main Campus' } },
    update: {},
    create: { universityId: university.id, name: 'Main Campus' },
  });
}

seed().catch((error) => { console.error('CampusLink seed failed:', error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
