
import "dotenv/config";
import { PrismaClient } from '@prisma/client';

async function main() {
    console.log('--- Direct Database Connection Test ---');
    console.log('DIRECT_URL starts with:', process.env.DIRECT_URL?.substring(0, 20), '...');

    const prisma = new PrismaClient({
        datasources: {
            db: {
                url: process.env.DIRECT_URL
            }
        },
        log: ['info', 'warn', 'error'],
    });

    try {
        console.log('Attempting to connect via DIRECT_URL...');
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log('✅ Direct Connection successful!', result);
    } catch (error: any) {
        console.error('❌ Direct Connection failed!');
        console.error('Error Message:', error.message);
    } finally {
        await prisma.$disconnect();
    }
}

main();
