'use client';

import { useParams } from 'next/navigation';
import ServicePaymentForm from '@/components/Forms/ServicePaymentForm';

export default function EditServicePaymentPage() {
    const params = useParams();
    const id = params?.id as string;

    return <ServicePaymentForm editId={id} />;
}
