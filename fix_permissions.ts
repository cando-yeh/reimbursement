import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = 'cando.yeh@gmail.com';
  console.log('Updating permissions for:', email);
  
  const user = await prisma.user.update({
    where: { email },
    data: {
      roleName: '管理員',
      permissions: ['general', 'finance_audit', 'user_management']
    }
  });
  
  console.log('Update successful:', user);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
