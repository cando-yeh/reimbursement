import "dotenv/config";
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

async function main() {
    console.log('--- Database Connection Test (v3) ---');
    console.log('DATABASE_URL starts with:', process.env.DATABASE_URL?.substring(0, 20), '...');

    const prisma = new PrismaClient({
        log: ['query', 'info', 'warn', 'error'],
    });

    try {
        console.log('Attempting to connect...');
        // Set a timeout for the query if possible, or reliance on Prisma's default
        const result = await prisma.$queryRaw`SELECT 1 as connected`;
        console.log('✅ Connection successful!', result);
    } catch (error: any) {
        console.error('❌ Connection failed!');
        console.error('Error Name:', error.name);
        console.error('Error Message:', error.message);

        const logContent = {
            name: error.name,
            code: error.code,
            message: error.message,
            stack: error.stack,
            meta: error.meta
        };

        fs.writeFileSync('db-error.log', JSON.stringify(logContent, null, 2));

    } finally {
        await prisma.$disconnect();
    }
}

main();
