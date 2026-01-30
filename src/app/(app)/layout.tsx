import React from 'react';
import { redirect } from 'next/navigation';
import ClientProviders from '@/components/Providers/ClientProviders';
import Layout from '@/components/Layout/Layout';
import { getCurrentUser } from '@/app/actions/claims';

export default async function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const user = await getCurrentUser();
    if (!user) {
        redirect('/login');
    }
    return (
        <ClientProviders>
            <Layout>
                {children}
            </Layout>
        </ClientProviders>
    );
}
