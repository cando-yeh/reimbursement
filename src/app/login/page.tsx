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

                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-white px-2 text-gray-500">或是使用測試帳號</span>
                        </div>
                    </div>

                    <div className="grid gap-3">
                        {availableUsers.map(user => (
                            <button
                                key={user.id}
                                onClick={() => handleMockLogin(user.id)}
                                className="w-full flex items-center gap-4 p-4 rounded-xl border border-gray-100 hover:border-blue-500 hover:bg-blue-50 transition-all group text-left"
                            >
                                <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center group-hover:bg-white transition-colors">
                                    {getRoleIcon(user.permissions)}
                                </div>
                                <div className="flex-1">
                                    <div className="font-bold text-gray-900">{user.name}</div>
                                    <div className="text-sm text-gray-500">{user.roleName}</div>
                                </div>
                                <div className="text-blue-600 opacity-0 transform -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all">
                                    登入 →
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

                <div className="mt-8 text-xs text-gray-400">
                    測試環境：包含 Google OAuth 與 Mock Data
                </div>
            </div>
        </div>
    );
}
