'use client';

import React from 'react';
import { AppProvider } from '@/context/AppContext';
import { ToastProvider } from '@/context/ToastContext';

export default function ClientProviders({ children }: { children: React.ReactNode }) {
    return (
        <ToastProvider>
            <AppProvider>
                {children}
            </AppProvider>
        </ToastProvider>
    );
}
