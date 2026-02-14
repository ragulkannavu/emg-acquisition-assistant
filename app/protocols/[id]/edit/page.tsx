'use client';

import { useParams } from 'next/navigation';
import { useProtocolStore } from '@/lib/store/protocolStore';
import ProtocolForm from '@/components/ProtocolForm';

export default function EditProtocolPage() {
  const params = useParams();
  const id = params.id as string;
  const { getProtocol } = useProtocolStore();
  const protocol = getProtocol(id);

  if (!protocol) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-muted-foreground">Protocol not found.</p>
      </div>
    );
  }

  return <ProtocolForm mode="edit" initialProtocol={protocol} />;
}
