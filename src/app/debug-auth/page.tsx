import React from 'react';
import { createClient } from '@/utils/supabase/server';
import { prisma } from '@/lib/prisma';

export default async function DebugAuthPage() {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    let dbUser = null;
    let dbError = null;

    if (user && user.email) {
        try {
            dbUser = await prisma.user.findUnique({
                where: { email: user.email }
            });
        } catch (e: any) {
            dbError = e.message;
        }
    }

    return (
        <div className="p-8 font-mono text-sm">
            <h1 className="text-xl font-bold mb-4">Auth Debugger</h1>

            <div className="mb-4">
                <h2 className="font-bold">Supabase Auth:</h2>
                <pre className="bg-gray-100 p-2 rounded">
                    {user ? JSON.stringify(user, null, 2) : 'No User Session'}
                </pre>
                {authError && <div className="text-red-500">Auth Error: {authError.message}</div>}
            </div>

            <div className="mb-4">
                <h2 className="font-bold">Database User (Prisma):</h2>
                <pre className="bg-gray-100 p-2 rounded">
                    {dbUser ? JSON.stringify(dbUser, null, 2) : 'No DB User Found'}
                </pre>
                {dbError && <div className="text-red-500">DB Error: {dbError}</div>}
            </div>

            <div>
                <a href="/login" className="text-blue-500 underline">Back to Login</a>
            </div>
        </div>
    );
}
