import { type EmailOtpType } from '@supabase/supabase-js';
import { type NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const token_hash = searchParams.get('token_hash');
    const type = searchParams.get('type') as EmailOtpType | null;
    const next = searchParams.get('next') ?? '/';
    // Standard OAuth code from Supabase
    const code = searchParams.get('code');

    if (code) {
        const supabase = await createClient();
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);

        if (!error && data.user) {
            // Check if user exists in public.User table, if not create it
            // We use simple sync here for MVP. 
            // Ideally, we might want to fetch more profile info or default role.
            const { prisma } = await import('@/lib/prisma');
            try {
                const email = data.user.email;
                if (email) {
                    await prisma.user.upsert({
                        where: { email },
                        update: {
                            // Update name if changed? Using metadata or just keeping sync
                            name: data.user.user_metadata.full_name || data.user.user_metadata.name || email.split('@')[0]
                        },
                        create: {
                            id: data.user.id, // Use Auth User ID as PK if uuid matches
                            email: email,
                            name: data.user.user_metadata.full_name || data.user.user_metadata.name || email.split('@')[0],
                            roleName: '一般員工', // Default role
                            permissions: ['general']
                        }
                    });
                }
            } catch (err) {
                console.error('Failed to sync user to database:', err);
                // We don't block login, but app functionality might be limited
            }

            const redirectTo = new URL(next, request.url);
            return NextResponse.redirect(redirectTo);
        }
    }

    if (token_hash && type) {
        const supabase = await createClient();

        const { error } = await supabase.auth.verifyOtp({
            type,
            token_hash,
        });
        if (!error) {
            const redirectTo = new URL(next, request.url);
            return NextResponse.redirect(redirectTo);
        }
    }

    // return the user to an error page with some instructions
    const errorUrl = new URL('/login?error=auth', request.url);
    return NextResponse.redirect(errorUrl);
}
