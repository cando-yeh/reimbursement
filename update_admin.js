const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const email = 'cando.yeh@gmail.com';
    console.log(`Checking for user: ${email}...`);

    try {
        const user = await prisma.user.findUnique({
            where: { email: email },
        });

        if (user) {
            console.log(`User found: ${user.name} (${user.id})`);
            console.log('Current permissions:', user.permissions);

            const updatedUser = await prisma.user.update({
                where: { email: email },
                data: {
                    roleName: '系統管理員',
                    permissions: ['general', 'finance_audit', 'user_management'],
                },
            });

            console.log('User permissions updated successfully to:', updatedUser.permissions);
            console.log('User role updated to:', updatedUser.roleName);
        } else {
            console.log('User not found. Creating new admin user...');
            const newUser = await prisma.user.create({
                data: {
                    name: 'Cando Yeh',
                    email: email,
                    roleName: '系統管理員',
                    permissions: ['general', 'finance_audit', 'user_management'],
                },
            });
            console.log('User created successfully:', newUser);
        }
    } catch (error) {
        console.error('Error updating user:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
