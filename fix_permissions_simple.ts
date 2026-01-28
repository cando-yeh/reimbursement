import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

async function main() {
  const email = 'cando.yeh@gmail.com';
  console.log('Updating user:', email);
  
  const user = await prisma.user.update({
    where: { email },
    data: {
      roleName: '財務 (管理員)',
      permissions: ['general', 'finance_audit', 'user_management']
    }
  });
  
  console.log('Done:', user);
}

main().catch(console.error).finally(() => prisma.$disconnect());
