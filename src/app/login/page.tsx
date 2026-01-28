'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { LogIn, User as UserIcon, ShieldCheck, Wallet, Chrome } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
    const { availableUsers, login } = useApp();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = createClient();

    const handleGoogleLogin = async () => {
        setIsLoading(true);

        // Priority: Manually set SITE_URL > Current window origin
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const redirectTo = `${siteUrl.replace(/\/$/, '')}/auth/callback`;

        console.log('Final Redirect URL being sent to Supabase:', redirectTo);

        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo,
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Error logging in:', error.message);
            alert('登入失敗，請稍後再試');
        } finally {
            setIsLoading(false);
        }
    };

    const handleMockLogin = (userId: string) => {
        login(userId);
        router.push('/');
    };

    const getRoleIcon = (permissions: string[]) => {
        if (permissions.includes('user_management')) return <ShieldCheck className="text-blue-500" size={24} />;
        if (permissions.includes('finance_audit')) return <Wallet className="text-purple-500" size={24} />;
        return <UserIcon className="text-gray-500" size={24} />;
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200 p-8">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center">
                <div className="w-16 h-16 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6 text-white shadow-lg">
                    <LogIn size={32} />
                </div>

                <h1 className="text-2xl font-bold text-gray-900 mb-2">請款報銷系統</h1>
                <p className="text-gray-500 mb-8">請選擇登入方式</p>

                <div className="space-y-6">
                    <button
                        type="button"
                        onClick={handleGoogleLogin}
                        disabled={isLoading}
                        className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 text-gray-700 py-3 rounded-xl hover:bg-gray-50 transition-all font-medium shadow-sm hover:shadow-md active:scale-[0.98]"
                    >
                        {isLoading ? (
                            <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                        ) : (
                            <Chrome size={20} className="text-blue-600" />
                        )}
                        使用 Google 帳號登入
                    </button>

                    <div className="pt-4">
                        <p className="text-sm text-gray-500 italic">
                            請確保您的 Google 帳戶在組織許可範圍內。
                        </p>
                    </div>
                </div>

                <div className="mt-8 text-xs text-gray-400">
                    系統安全保護中：僅限內部 Google 帳戶訪問
                </div>
            </div>
        </div>
    );
}
