import dynamic from 'next/dynamic';
import DashboardSkeleton from '@/components/Dashboard/DashboardSkeleton';

const DashboardPageClient = dynamic(() => import('./DashboardPageClient'), {
  ssr: false,
  loading: () => <DashboardSkeleton />,
});

export default function DashboardPage() {
  return <DashboardPageClient />;
}
