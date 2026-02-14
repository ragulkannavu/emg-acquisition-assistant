'use client';

import { useParams, notFound } from 'next/navigation';
import { useProtocolStore } from '@/lib/store/protocolStore';
import { useSessionStore } from '@/lib/store/sessionStore';
import Navbar from '@/components/Navbar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Play, Edit, ArrowLeft, Clock, Repeat, Zap, Moon, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { formatDate, formatDuration } from '@/lib/utils';
import { MovementType } from '@/lib/types';

const typeIcons: Record<MovementType, typeof Play> = {
  contraction: Zap,
  rest: Moon,
  transition: ArrowRight,
};

const typeColors: Record<MovementType, string> = {
  contraction: 'bg-green-500/10 text-green-400 border-green-500/20',
  rest: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  transition: 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20',
};

export default function ProtocolDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { getProtocol } = useProtocolStore();
  const { getSessionsForProtocol } = useSessionStore();

  const protocol = getProtocol(id);
  if (!protocol) return notFound();

  const sessions = getSessionsForProtocol(id);
  const totalDurationMs = protocol.movements.reduce(
    (sum, m) => sum + m.duration_ms * m.repetitions,
    0
  );

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-1.5">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold">{protocol.name}</h1>
            {protocol.description && (
              <p className="text-muted-foreground mt-1">{protocol.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                ~{formatDuration(totalDurationMs)}
              </span>
              <span>{protocol.movements.length} movements</span>
              <span>Created {formatDate(protocol.created_at)}</span>
            </div>
          </div>
          <div className="flex gap-2 shrink-0">
            <Link href={`/protocols/${id}/edit`}>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Edit className="h-4 w-4" />
                Edit
              </Button>
            </Link>
            <Link href={`/protocols/${id}/execute`}>
              <Button size="sm" className="gap-1.5">
                <Play className="h-4 w-4" />
                Run Protocol
              </Button>
            </Link>
          </div>
        </div>

        <Card className="mb-4">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Movements</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {protocol.movements.map((movement, index) => {
              const Icon = typeIcons[movement.type];
              return (
                <div
                  key={movement.id}
                  className="flex items-start gap-3 p-3 rounded-lg bg-muted/30 border border-border/50"
                >
                  <span className="text-xs font-mono text-muted-foreground w-5 shrink-0 pt-0.5">
                    {index + 1}
                  </span>
                  <Icon className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{movement.name}</span>
                      <Badge
                        variant="outline"
                        className={`text-xs ${typeColors[movement.type]}`}
                      >
                        {movement.type}
                      </Badge>
                      {movement.muscle_group && (
                        <span className="text-xs text-muted-foreground">{movement.muscle_group}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {movement.duration_ms / 1000}s
                      </span>
                      <span className="flex items-center gap-1">
                        <Repeat className="h-3 w-3" />
                        {movement.repetitions} reps
                      </span>
                    </div>
                    {movement.instructions && (
                      <p className="text-xs text-muted-foreground/70 mt-1 italic">
                        {movement.instructions}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {sessions.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Recent Sessions ({sessions.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {sessions.slice(0, 5).map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between p-2 rounded-lg bg-muted/30 text-sm"
                >
                  <span className="text-muted-foreground">{formatDate(session.start_time)}</span>
                  <Badge
                    variant="outline"
                    className={
                      session.status === 'completed'
                        ? 'text-green-400 border-green-500/20 bg-green-500/10'
                        : 'text-red-400 border-red-500/20 bg-red-500/10'
                    }
                  >
                    {session.status}
                  </Badge>
                </div>
              ))}
              {sessions.length > 5 && (
                <Link href="/sessions" className="block text-center text-xs text-primary hover:underline mt-1">
                  View all {sessions.length} sessions
                </Link>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
