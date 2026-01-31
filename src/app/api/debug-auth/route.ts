import { createClient } from '@/utils/supabase/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email?.toLowerCase() }
        });

        const allUsers = await prisma.user.findMany();

        return NextResponse.json({
            supabaseUser: {
                id: user.id,
                email: user.email,
                name: user.user_metadata?.full_name
            },
            dbMatch: dbUser,
            dbCount: allUsers.length,
            dbEmails: allUsers.map(u => u.email)
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message });
    }
}
