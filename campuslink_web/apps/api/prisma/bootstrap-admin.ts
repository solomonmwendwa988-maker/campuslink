import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();
  if (!email) {
    console.error('Usage: npm run admin:bootstrap -- <existing-account-email>');
    process.exitCode = 1;
    return;
  }
  const current = await prisma.user.findFirst({ where: { role: 'SUPER_ADMIN', deletedAt: null }, select: { email: true } });
  if (current) {
    console.error(`A Super Admin already exists (${current.email}). Bootstrap is locked.`);
    process.exitCode = 1;
    return;
  }
  const target = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, username: true, deletedAt: true } });
  if (!target || target.deletedAt) {
    console.error('No active account found for that email. Create and verify your own account first.');
    process.exitCode = 1;
    return;
  }
  await prisma.user.update({ where: { id: target.id }, data: { role: 'SUPER_ADMIN' } });
  console.log(`Bootstrap complete: ${target.email} (${target.username}) is now SUPER_ADMIN.`);
  console.log('Sign in normally, then access the protected admin auth endpoint.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; }).finally(async () => prisma.$disconnect());
