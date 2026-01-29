import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'cando.yeh@gmail.com';
    console.log('--- Database Check for:', email, '---');

    // 1. Disable RLS (as requested by user as a troubleshooting step)
    try {
        await prisma.$executeRawUnsafe('ALTER TABLE "User" DISABLE ROW LEVEL SECURITY;');
        console.log('RLS Disabled for "User" table.');
    } catch (e) {
        console.error('Failed to disable RLS (might not have permissions or already disabled):', e);
    }

    // 2. Fetch User
    const user = await prisma.user.findUnique({
        where: { email: email }
    });

    if (user) {
        console.log('Current User record in DB:', JSON.stringify(user, null, 2));

        // 3. Ensure it's correct (re-apply just in case)
        const updated = await prisma.user.update({
            where: { id: user.id },
            data: {
                roleName: '財務暨管理者',
                permissions: ['general', 'finance_audit', 'user_management']
            }
        });
        console.log('Re-applied Admin Role. Result:', JSON.stringify(updated, null, 2));
    } else {
        console.log('User not found in database!');
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
