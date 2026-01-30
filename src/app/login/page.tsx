'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Chrome, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

export default function LoginPage() {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const supabase = useMemo(() => createClient(), []);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    useEffect(() => {
        let isActive = true;
        supabase.auth.getUser().then(({ data: { user } }) => {
            if (isActive && user) router.push('/');
        });
        return () => {
            isActive = false;
        };
    }, [router, supabase]);

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
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (error: any) {
            console.error('Error logging in:', error.message);
            alert('登入失敗，請稍後再試');
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-white font-sans overflow-hidden">
            {/* Left Panel - Visual & Brand using Tailwind Class for Gradient */}
            <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] text-white flex-col justify-center items-center p-12 lg:p-20">

                {/* Abstract Shapes/Mesh Gradient Effect */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none opacity-40">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#3B82F6] rounded-full blur-[100px] animate-pulse" style={{ animationDuration: '8s' }} />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-[#8B5CF6] rounded-full blur-[120px] animate-pulse" style={{ animationDuration: '10s' }} />
                </div>

                {/* Content Centered Vertically */}
                <div className="relative z-10 max-w-md animate-fade-in-up text-center">
                    <h1 className="text-5xl font-extrabold leading-tight mb-6">
                        企業報銷<br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">
                            化繁為簡
                        </span>
                    </h1>
                    <p className="text-lg text-slate-300 leading-relaxed mb-8">
                        智能化的請款流程，即時的審核與撥款通知。<br />讓每一筆支出都清晰透明，效率倍增。
                    </p>

                    <div className="space-y-4 flex flex-col items-center">
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle2 size={18} className="text-blue-400" />
                            <span>自動化 Email 通知流程</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle2 size={18} className="text-purple-400" />
                            <span>實時追蹤申請狀態</span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-slate-300">
                            <CheckCircle2 size={18} className="text-indigo-400" />
                            <span>安全可靠的 Google 企業登入</span>
                        </div>
                    </div>
                </div>

                <div className="absolute bottom-8 left-12 text-xs text-slate-500 z-10">
                    © 2024 Enterprise Reimbursement System. All rights reserved.
                </div>
            </div>

            {/* Right Panel - Login Form */}
            <div className="flex items-center justify-center p-8 lg:p-24 bg-gray-50/50">
                <div className="w-full max-w-sm space-y-8 animate-fade-in">

                    {/* Mobile Header (Only visible on small screens) */}
                    <div className="lg:hidden text-center mb-8">
                        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg">
                            <div className="w-6 h-6 bg-white rounded-full" />
                        </div>
                        <h2 className="text-2xl font-bold text-gray-900">FinSystem</h2>
                    </div>

                    <div className="text-center lg:text-left">
                        <h2 className="text-3xl font-bold tracking-tight text-gray-900">歡迎回來</h2>
                        <p className="mt-2 text-sm text-gray-500">
                            請使用您的企業 Google 帳號進行登入
                        </p>
                    </div>

                    <div className="space-y-6">
                        <div className="bg-white p-1 rounded-2xl border border-gray-100 shadow-xl shadow-gray-200/50 transform transition-all duration-300 hover:scale-[1.02]">
                            <button
                                type="button"
                                onClick={handleGoogleLogin}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 py-4 rounded-xl hover:bg-gray-50 transition-all font-semibold group relative overflow-hidden"
                            >
                                {isLoading ? (
                                    <div className="w-5 h-5 border-2 border-gray-300 border-t-blue-600 rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Chrome size={22} className="text-blue-600 transition-transform group-hover:scale-110 duration-300" />
                                        <span>使用 Google 帳號登入</span>
                                        <ArrowRight size={18} className="text-gray-400 absolute right-6 opacity-0 group-hover:opacity-100 transform translate-x-[-10px] group-hover:translate-x-0 transition-all duration-300" />
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <span className="w-full border-t border-gray-200" />
                            </div>
                            <div className="relative flex justify-center text-xs uppercase">
                                <span className="bg-gray-50/50 px-2 text-gray-400">Security Check</span>
                            </div>
                        </div>

                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100">
                            <div className="flex gap-3">
                                <div className="mt-0.5">
                                    <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                </div>
                                <p className="text-xs text-blue-800/80 leading-relaxed">
                                    本系統僅限授權員工使用。登入即代表您同意系統使用規範與隱私權政策。如遇登入問題，請聯繫 IT 部門。
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
