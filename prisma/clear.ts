import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Clearing database...');

    // Delete in order to respect foreign key constraints
    await prisma.claimHistory.deleteMany();
    await prisma.claimItem.deleteMany();
    await prisma.claim.deleteMany();
    await prisma.vendorRequest.deleteMany();
    await prisma.payment.deleteMany();
    await prisma.vendor.deleteMany();
    await prisma.user.deleteMany();

    console.log('Database cleared.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
