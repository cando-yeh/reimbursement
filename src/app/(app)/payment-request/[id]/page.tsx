'use client';

import { useParams } from 'next/navigation';
import PaymentRequestForm from '@/components/Forms/PaymentRequestForm';

export default function EditPaymentRequestPage() {
    const params = useParams();
    const id = params?.id as string;

    return <PaymentRequestForm editId={id} />;
}
