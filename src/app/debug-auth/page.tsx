'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugAuthPage() {
    const [origin, setOrigin] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [supabaseConfigured, setSupabaseConfigured] = useState<boolean | null>(null);

    useEffect(() => {
        const currentOrigin = window.location.origin;
        setOrigin(currentOrigin);
        setRedirectUrl(`${currentOrigin}/auth/callback`);

        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        setSupabaseConfigured(!!(supabaseUrl && supabaseKey));
    }, []);

    return (
        <div className="p-10 font-sans">
            <h1 className="text-2xl font-bold mb-6">Authentication Diagnostic Tool</h1>

            <div className="space-y-6 max-w-2xl bg-gray-50 p-6 rounded-lg border border-gray-200">
                <section>
                    <h2 className="text-lg font-semibold text-gray-700">1. Current Environment Info</h2>
                    <p className="mt-2"><strong>Origin ( window.location.origin ):</strong></p>
                    <code className="block bg-white p-2 border rounded mt-1 select-all">{origin || 'Loading...'}</code>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-gray-700">2. Supabase Redirect URL</h2>
                    <p className="mt-1 text-sm text-gray-500">Copy this exact string and add it to "Redirect URLs" in Supabase:</p>
                    <code className="block bg-blue-50 text-blue-700 p-2 border border-blue-200 rounded mt-1 font-bold select-all">
                        {redirectUrl || 'Loading...'}
                    </code>
                </section>

                <section>
                    <h2 className="text-lg font-semibold text-gray-700">3. Vercel Env Vars Check</h2>
                    <div className="mt-2 flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${supabaseConfigured ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>
                            {supabaseConfigured === null ? 'Checking...' :
                                supabaseConfigured ? 'Supabase Env Vars Detected' : 'Missing Supabase Env Vars in Vercel!'}
                        </span>
                    </div>
                </section>

                <section className="bg-yellow-50 p-4 border border-yellow-200 rounded">
                    <h3 className="font-bold text-yellow-800">Next Steps:</h3>
                    <ul className="list-decimal ml-5 mt-2 space-y-2 text-yellow-800">
                        <li>Go to <strong>Supabase Dashboard</strong> &gt; <strong>Authentication</strong> &gt; <strong>URL Configuration</strong>.</li>
                        <li>Add the blue URL above to <strong>Redirect URLs</strong>.</li>
                        <li>Ensure <strong>Site URL</strong> is ALSO set to <code>{origin}</code>.</li>
                        <li>Click <strong>SAVE</strong> at the bottom of the Supabase page.</li>
                    </ul>
                </section>
            </div>

            <button
                onClick={() => window.location.href = '/login'}
                className="mt-6 text-blue-600 hover:underline"
            >
                &larr; Back to Login
            </button>
        </div>
    );
}
