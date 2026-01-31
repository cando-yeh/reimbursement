import { PrismaClient } from '@prisma/client';

async function main() {
    const prisma = new PrismaClient();
    try {
        const users = await prisma.user.findMany();
        if (users.length === 0) {
            console.log('-- No data found in User table');
            return;
        }

        const columns = Object.keys(users[0]);
        const tableName = '"User"';

        users.forEach(user => {
            const values = columns.map(col => {
                const val = (user as any)[col];
                if (val === null) return 'NULL';
                if (val instanceof Date) return `'${val.toISOString()}'`;
                if (Array.isArray(val)) return `'${JSON.stringify(val).replace(/'/g, "''")}'::text[]`;
                if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
                return val;
            });

            console.log(`INSERT INTO ${tableName} (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});`);
        });
    } catch (error) {
        console.error('Error fetching users:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
