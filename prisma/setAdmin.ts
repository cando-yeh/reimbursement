import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'cando.yeh@gmail.com';
    console.log(`Updating user: ${email}`);

    const user = await prisma.user.update({
        where: { email: email },
        data: {
            roleName: '財務暨管理者',
            permissions: ['general', 'finance_audit', 'user_management']
        }
    });

    console.log('Update successful:', JSON.stringify(user, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
