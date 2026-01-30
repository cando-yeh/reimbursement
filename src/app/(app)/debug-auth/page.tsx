'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase/client';

export default function DebugAuthPage() {
    const [origin, setOrigin] = useState('');
    const [redirectUrl, setRedirectUrl] = useState('');
    const [configInfo, setConfigInfo] = useState({
        supabaseUrl: '',
        siteUrlVar: '',
    });

    useEffect(() => {
        const currentOrigin = window.location.origin;
        setOrigin(currentOrigin);

        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || currentOrigin;
        setRedirectUrl(`${siteUrl.replace(/\/$/, '')}/auth/callback`);

        setConfigInfo({
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'Missing!',
            siteUrlVar: process.env.NEXT_PUBLIC_SITE_URL || 'Not set (using origin)',
        });
    }, []);

    const supabase = createClient();

    const testLogin = async () => {
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
        const targetUrl = `${siteUrl.replace(/\/$/, '')}/auth/callback`;

        alert(`Starting redirect test to:\n${targetUrl}\n\nPlease ensure this EXACT URL is in your Supabase "Redirect URLs" list.`);

        await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: targetUrl,
            },
        });
    };

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 font-sans">
            <div className="max-w-3xl mx-auto bg-white shadow-2xl rounded-3xl overflow-hidden border border-gray-100">
                <div className="bg-blue-600 px-8 py-6 text-white">
                    <h1 className="text-2xl font-bold">Supabase Auth 診斷工具</h1>
                    <p className="opacity-80 mt-1">專門解決 "requested path is invalid" 錯誤</p>
                </div>

                <div className="p-8 space-y-8">
                    {/* Step 1 */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-900 border-l-4 border-blue-500 pl-3 mb-4">
                            步驟 1：檢查 Vercel 環境變數
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">Supabase URL</p>
                                <p className="font-mono text-sm break-all">{configInfo.supabaseUrl}</p>
                            </div>
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                                <p className="text-xs text-gray-400 uppercase font-bold tracking-wider mb-1">NEXT_PUBLIC_SITE_URL</p>
                                <p className="font-mono text-sm truncate">{configInfo.siteUrlVar}</p>
                            </div>
                        </div>
                    </section>

                    {/* Step 2 */}
                    <section>
                        <h2 className="text-lg font-bold text-gray-900 border-l-4 border-blue-500 pl-3 mb-4">
                            步驟 2：複製這兩段設定到 Supabase
                        </h2>
                        <div className="space-y-4">
                            <div className="p-5 bg-blue-50 rounded-2xl border border-blue-100">
                                <p className="text-sm font-bold text-blue-800 mb-2 underline decoration-blue-300">
                                    A. 請新增此「Redirect URL」（跳轉網址）:
                                </p>
                                <code className="block bg-white text-blue-600 p-4 rounded-xl border border-blue-200 font-mono font-bold text-lg select-all break-all shadow-sm">
                                    {redirectUrl}
                                </code>
                                <p className="text-xs text-blue-500 mt-2 italic">※ 請直接點兩下複製，包括 https:// 和最後的 /auth/callback</p>
                            </div>

                            <div className="p-5 bg-green-50 rounded-2xl border border-green-100">
                                <p className="text-sm font-bold text-green-800 mb-2 underline decoration-green-300">
                                    B. 請確保「Site URL」維持此網址:
                                </p>
                                <code className="block bg-white text-green-600 p-4 rounded-xl border border-green-200 font-mono select-all break-all shadow-sm">
                                    {origin}
                                </code>
                            </div>
                        </div>
                        <p className="text-sm text-center text-gray-400 mt-2">
                            設定路徑：Supabase Dashboard &gt; Authentication &gt; URL Configuration &gt; 按下 Save
                        </p>
                    </section>

                    {/* Step 3 */}
                    <section className="pt-4 border-t border-gray-100 text-center space-y-4">
                        <button
                            onClick={testLogin}
                            className="inline-flex items-center px-8 py-4 bg-blue-600 border border-transparent rounded-2xl shadow-lg text-lg font-bold text-white hover:bg-blue-700 focus:outline-none transition-all active:scale-95"
                        >
                            🚀 確認已設定好，立即測試登入
                        </button>
                        <br />
                        <button
                            onClick={() => window.location.href = '/login'}
                            className="text-gray-400 hover:text-blue-500 transition-colors text-sm"
                        >
                            &larr; 返回一般登入頁面
                        </button>
                    </section>
                </div>

                <div className="bg-gray-50 px-8 py-4 text-xs text-gray-400 leading-relaxed">
                    <strong>為什麼會報錯？</strong> Supabase 出於安全考量，只允許在「跳轉白名單」內的網址。
                    如果在 Vercel 有設定 <code>NEXT_PUBLIC_SITE_URL</code>，系統會優先強制跳回該網址。
                </div>
            </div>
        </div>
    );
}
