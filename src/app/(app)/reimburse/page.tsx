'use client';

import { redirect } from 'next/navigation';
import { useEffect } from 'react';

// Redirect /reimburse to /reimburse/new for consistency
export default function ReimbursePage() {
    useEffect(() => {
        window.location.href = '/reimburse/new';
    }, []);

    return null;
}
