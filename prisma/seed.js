const { PrismaClient } = require('@prisma/client');

console.log('SEED: DATABASE_URL loaded:', process.env.DATABASE_URL ? 'YES' : 'NO');
if (process.env.DATABASE_URL) console.log('SEED: URL prefix:', process.env.DATABASE_URL.substring(0, 20));

const prisma = new PrismaClient();

// Only keep the primary admin user for system access
const INITIAL_USERS = [
    { id: 'u5', name: 'Cando Yeh', roleName: '系統管理員', permissions: ['general', 'finance_audit', 'user_management'], email: 'cando.yeh@gmail.com' },
];

async function main() {
    console.log('Seeding database (Production Mode)...');

    // Create Initial Admin User
    for (const u of INITIAL_USERS) {
        await prisma.user.upsert({
            where: { id: u.id },
            update: {
                name: u.name,
                roleName: u.roleName,
                permissions: u.permissions,
                email: u.email,
            },
            create: {
                id: u.id,
                name: u.name,
                roleName: u.roleName,
                permissions: u.permissions,
                email: u.email,
            },
        });
    }

    console.log('Seeding complete. Mock data removed.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
