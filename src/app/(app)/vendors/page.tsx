'use client';

import dynamic from 'next/dynamic';
import PageSkeleton from '@/components/Common/PageSkeleton';

const VendorListPageClient = dynamic(() => import('./VendorListPageClient'), {
  ssr: false,
  loading: () => <PageSkeleton />,
});

export default function VendorListPage() {
  return <VendorListPageClient />;
}
