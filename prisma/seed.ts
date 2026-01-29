import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const MOCK_USERS = [
    { id: 'u1', name: 'User A', roleName: '一般員工', permissions: ['general'], email: 'user.a@company.com', approverId: 'u2' },
    { id: 'u2', name: 'User B', roleName: '一般員工', permissions: ['general'], email: 'user.b@company.com', approverId: 'u3' },
    { id: 'u3', name: 'User C', roleName: '財務', permissions: ['general', 'finance_audit'], email: 'finance.c@company.com', approverId: 'u2' },
    { id: 'u4', name: '管理者', roleName: '一般員工 (管理員)', permissions: ['general', 'user_management'], email: 'admin.d@company.com', approverId: 'u2' },
];

const INITIAL_VENDORS = [
    { id: 'v1', name: 'TechSolutions Inc.', serviceContent: 'IT Support & Hardware', bankCode: '004', bankAccount: '123456789012' },
    { id: 'v2', name: 'CleanOffice Supplies', serviceContent: 'Office Supplies', bankCode: '822', bankAccount: '987654321098' },
    { id: 'v3', name: 'Global Logistics', serviceContent: 'Shipping & Delivery', bankCode: '013', bankAccount: '456789012345' },
];

const INITIAL_CLAIMS = [
    {
        id: 'c1',
        type: 'employee',
        payee: 'John Doe',
        description: '10月份差旅費報銷',
        amount: 120.50,
        date: '2023-10-25',
        status: 'pending_finance',
        items: [
            { id: 'i1', date: '2023-10-24', amount: 120.50, description: 'Client A 訪問交通費' }
        ],
        applicantId: 'u1'
    },
    {
        id: 'c2',
        type: 'vendor',
        payee: 'TechSolutions Inc.',
        payeeId: 'v1',
        description: 'Q4 伺服器維護',
        amount: 5000.00,
        date: '2023-10-26',
        status: 'approved',
        items: [
            { id: 'i1', date: '2023-10-26', amount: 5000.00, description: 'Q4 伺服器維護費' }
        ],
        applicantId: 'u2'
    },
    {
        id: 'c3',
        type: 'employee',
        payee: 'Jane Smith',
        description: '團隊聚餐',
        amount: 45.00,
        date: '2023-10-27',
        status: 'pending_approval',
        items: [
            { id: 'i1', date: '2023-10-27', amount: 45.00, description: '迎新午餐' }
        ],
        applicantId: 'u3'
    },
];

async function main() {
    console.log('Seeding database...');

    // Create Users (handle relations)
    // 1. Create Users without approverId
    for (const u of MOCK_USERS) {
        await prisma.user.upsert({
            where: { id: u.id },
            update: {},
            create: {
                id: u.id,
                name: u.name,
                roleName: u.roleName,
                permissions: u.permissions,
                email: u.email,
                // approverId: undefined // skip
            },
        });
    }

    // 2. Link Approvers (Self-relation update)
    for (const u of MOCK_USERS) {
        if (u.approverId && u.approverId !== u.id) {
            await prisma.user.update({
                where: { id: u.id },
                data: { approverId: u.approverId }
            });
        }
    }

    // Create Vendors
    for (const v of INITIAL_VENDORS) {
        await prisma.vendor.upsert({
            where: { id: v.id },
            update: {},
            create: {
                id: v.id,
                name: v.name,
                serviceContent: v.serviceContent,
                bankCode: v.bankCode,
                bankAccount: v.bankAccount,
                status: 'active',
            },
        });
    }

    // Create Claims
    for (const c of INITIAL_CLAIMS) {
        await prisma.claim.upsert({
            where: { id: c.id },
            update: {},
            create: {
                id: c.id,
                type: c.type as any,
                payee: c.payee,
                payeeId: c.payeeId,
                description: c.description,
                amount: c.amount,
                date: new Date(c.date),
                status: c.status as any,
                lineItems: {
                    create: c.items.map(item => ({
                        date: new Date(item.date),
                        amount: item.amount,
                        description: item.description,
                    }))
                },
                applicantId: c.applicantId,
                history: {
                    create: [
                        {
                            timestamp: new Date().toISOString(),
                            actorId: 'system',
                            actorName: 'System',
                            action: 'seeded',
                        }
                    ]
                },
            },
        });
    }

    console.log('Seeding complete.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
