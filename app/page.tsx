'use client';

import { useProtocolStore } from '@/lib/store/protocolStore';
import Navbar from '@/components/Navbar';
import ProtocolCard from '@/components/ProtocolCard';
import { Button } from '@/components/ui/button';
import { Activity, Plus, FileText } from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const { protocols, deleteProtocol } = useProtocolStore();

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Activity className="h-6 w-6 text-primary" />
              EMG Protocols
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage and run your EMG acquisition protocols
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/protocols/import">
              <Button variant="outline" size="sm" className="gap-1.5">
                <FileText className="h-4 w-4" />
                Import PDF
              </Button>
            </Link>
            <Link href="/protocols/new">
              <Button size="sm" className="gap-1.5">
                <Plus className="h-4 w-4" />
                New Protocol
              </Button>
            </Link>
          </div>
        </div>

        {protocols.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-border rounded-xl">
            <Activity className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-muted-foreground">No protocols yet</h2>
            <p className="text-sm text-muted-foreground/70 mt-1 mb-6">
              Create your first EMG acquisition protocol to get started
            </p>
            <div className="flex justify-center gap-3">
              <Link href="/protocols/import">
                <Button variant="outline" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Import from PDF
                </Button>
              </Link>
              <Link href="/protocols/new">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  Create Manually
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {protocols.map((protocol) => (
              <ProtocolCard
                key={protocol.id}
                protocol={protocol}
                onDelete={deleteProtocol}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
