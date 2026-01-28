import "dotenv/config";
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const email = 'cando.yeh@gmail.com';

    console.log(`Updating permissions for: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email },
        });

        if (!user) {
            console.error(`User with email ${email} not found.`);
            process.exit(1);
        }

        const updatedUser = await prisma.user.update({
            where: { email },
            data: {
                roleName: '財務 + 管理者',
                permissions: ['general', 'finance_audit', 'user_management'],
            },
        });

        console.log('✅ Permissions updated successfully!');
        console.log(updatedUser);

    } catch (error) {
        console.error('❌ Failed to update user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
