'use client';

import { useParams } from 'next/navigation';
import { useProtocolStore } from '@/lib/store/protocolStore';
import ExecutionEngine from '@/components/ExecutionEngine';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function ExecuteProtocolPage() {
  const params = useParams();
  const id = params.id as string;
  const { getProtocol } = useProtocolStore();
  const protocol = getProtocol(id);

  if (!protocol) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">Protocol not found.</p>
        <Link href="/">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  if (protocol.movements.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground text-lg">This protocol has no movements.</p>
        <Link href={`/protocols/${id}`}>
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Edit Protocol
          </Button>
        </Link>
      </div>
    );
  }

  return <ExecutionEngine protocol={protocol} />;
}
