'use client';

import { useParams } from 'next/navigation';
import EmployeeReimbursementForm from '@/components/Forms/EmployeeReimbursementForm';

export default function EditReimbursementPage() {
    const params = useParams();
    const id = params?.id as string;

    return <EmployeeReimbursementForm editId={id} />;
}
