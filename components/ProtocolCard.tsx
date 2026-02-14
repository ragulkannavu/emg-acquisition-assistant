'use client';

import Link from 'next/link';
import { Protocol } from '@/lib/types';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Play, Edit, Trash2, Clock, Layers } from 'lucide-react';
import { formatDate, formatDuration } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface ProtocolCardProps {
  protocol: Protocol;
  onDelete: (id: string) => void;
}

export default function ProtocolCard({ protocol, onDelete }: ProtocolCardProps) {
  const totalDurationMs = protocol.movements.reduce((sum, m) => {
    return sum + m.duration_ms * m.repetitions;
  }, 0);

  return (
    <Card className="flex flex-col hover:border-primary/50 transition-colors">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base leading-tight">{protocol.name}</CardTitle>
          <Badge variant="secondary" className="shrink-0 text-xs">
            {protocol.movements.length} {protocol.movements.length === 1 ? 'movement' : 'movements'}
          </Badge>
        </div>
        {protocol.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{protocol.description}</p>
        )}
      </CardHeader>

      <CardContent className="pb-2 flex-1">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            ~{formatDuration(totalDurationMs)}
          </span>
          <span className="flex items-center gap-1">
            <Layers className="h-3.5 w-3.5" />
            {protocol.movements.map((m) => m.muscle_group).filter((v, i, a) => a.indexOf(v) === i).join(', ') || 'No muscles'}
          </span>
        </div>
        <p className="text-xs text-muted-foreground/60 mt-2">
          Created {formatDate(protocol.created_at)}
        </p>
      </CardContent>

      <CardFooter className="pt-2 gap-2">
        <Link href={`/protocols/${protocol.id}/execute`} className="flex-1">
          <Button className="w-full gap-1.5" size="sm">
            <Play className="h-3.5 w-3.5" />
            Run
          </Button>
        </Link>
        <Link href={`/protocols/${protocol.id}`}>
          <Button variant="outline" size="sm" className="gap-1.5">
            <Edit className="h-3.5 w-3.5" />
            Edit
          </Button>
        </Link>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="sm" className="text-destructive hover:text-destructive hover:bg-destructive/10">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Protocol</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete &quot;{protocol.name}&quot;? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => onDelete(protocol.id)}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
