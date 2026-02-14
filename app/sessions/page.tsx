'use client';

import { useState, useEffect } from 'react';
import { useSessionStore } from '@/lib/store/sessionStore';
import { useAuth } from '@/lib/auth-context';
import { getUserSessions, deleteSessionFromCloud } from '@/lib/db';
import { Session } from '@/lib/types';
import Navbar from '@/components/Navbar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { History, Download, Trash2, ChevronDown, ChevronUp, Clock, Cloud, HardDrive } from 'lucide-react';
import { formatDate } from '@/lib/utils';
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

function exportSession(session: { id: string; protocol_name: string; start_time: string; end_time: string; logs: { movement_name: string; rep: number; started_at: string; ended_at: string }[]; status: string }) {
  const lines = [
    `EMG Session Export`,
    `Protocol: ${session.protocol_name}`,
    `Start: ${formatDate(session.start_time)}`,
    `End: ${formatDate(session.end_time)}`,
    `Status: ${session.status}`,
    ``,
    `movement_name,rep,started_at,ended_at,duration_ms`,
    ...session.logs.map((l) => {
      const dur = new Date(l.ended_at).getTime() - new Date(l.started_at).getTime();
      return `"${l.movement_name}",${l.rep},${l.started_at},${l.ended_at},${dur}`;
    }),
  ];

  const blob = new Blob([lines.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `emg-session-${session.id}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

function SessionRow({ session, onDelete, isCloud }: {
  session: { id: string; protocol_name: string; start_time: string; end_time: string; logs: { movement_id: string; movement_name: string; rep: number; started_at: string; ended_at: string }[]; status: string };
  onDelete: (id: string) => void;
  isCloud?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const durationMs = new Date(session.end_time).getTime() - new Date(session.start_time).getTime();
  const durationSec = Math.round(durationMs / 1000);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <div className="flex items-center gap-3 p-3">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-muted-foreground hover:text-foreground"
        >
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm">{session.protocol_name}</span>
            <Badge
              variant="outline"
              className={
                session.status === 'completed'
                  ? 'text-green-400 border-green-500/20 bg-green-500/10 text-xs'
                  : 'text-red-400 border-red-500/20 bg-red-500/10 text-xs'
              }
            >
              {session.status}
            </Badge>
            {isCloud && (
              <span title="Synced to cloud"><Cloud className="h-3 w-3 text-blue-400" /></span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            <span>{formatDate(session.start_time)}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {durationSec}s
            </span>
            <span>{session.logs.length} movements logged</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => exportSession(session)}
            className="h-7 w-7 p-0 text-muted-foreground"
            title="Export as CSV"
          >
            <Download className="h-4 w-4" />
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Session</AlertDialogTitle>
                <AlertDialogDescription>
                  Delete this session log? This cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => onDelete(session.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {expanded && session.logs.length > 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-3">
          <div className="text-xs font-medium text-muted-foreground mb-2">Movement Log</div>
          <div className="space-y-1 max-h-48 overflow-y-auto">
            {session.logs.map((log, i) => {
              const dur = new Date(log.ended_at).getTime() - new Date(log.started_at).getTime();
              return (
                <div key={i} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{log.movement_name}</span>
                  <span>Rep {log.rep}</span>
                  <span>{Math.round(dur / 100) / 10}s</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {expanded && session.logs.length === 0 && (
        <div className="border-t border-border bg-muted/20 px-4 py-3 text-xs text-muted-foreground">
          No movements were logged.
        </div>
      )}
    </div>
  );
}

export default function SessionsPage() {
  const { sessions: localSessions, deleteSession: deleteLocal } = useSessionStore();
  const { user } = useAuth();
  const [cloudSessions, setCloudSessions] = useState<Session[]>([]);
  const [loadingCloud, setLoadingCloud] = useState(false);

  useEffect(() => {
    if (user) {
      setLoadingCloud(true);
      getUserSessions(user.uid)
        .then(setCloudSessions)
        .catch(console.error)
        .finally(() => setLoadingCloud(false));
    } else {
      setCloudSessions([]);
    }
  }, [user]);

  const handleDeleteCloud = async (id: string) => {
    if (!user) return;
    try {
      await deleteSessionFromCloud(user.uid, id);
      setCloudSessions((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      console.error('Failed to delete cloud session:', err);
    }
  };

  const totalCount = (user ? cloudSessions.length : 0) + localSessions.length;

  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <History className="h-6 w-6 text-primary" />
              Session History
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              {totalCount} session{totalCount !== 1 ? 's' : ''} recorded
            </p>
          </div>
        </div>

        {/* Cloud sessions */}
        {user && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Cloud className="h-4 w-4 text-blue-400" />
              <h2 className="text-sm font-medium text-muted-foreground">Cloud Sessions</h2>
            </div>
            {loadingCloud ? (
              <div className="text-center py-8 text-sm text-muted-foreground">Loading cloud sessions...</div>
            ) : cloudSessions.length === 0 ? (
              <div className="text-center py-6 border border-dashed border-border rounded-lg text-sm text-muted-foreground">
                No cloud sessions yet. Run a protocol while signed in to sync.
              </div>
            ) : (
              <div className="space-y-2">
                {cloudSessions.map((session) => (
                  <SessionRow key={session.id} session={session} onDelete={handleDeleteCloud} isCloud />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Local sessions */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium text-muted-foreground">Local Sessions</h2>
          </div>
          {localSessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-border rounded-xl">
              <History className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-muted-foreground">No local sessions</h2>
              <p className="text-sm text-muted-foreground/70 mt-1">
                Run a protocol to record your first session
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {localSessions.map((session) => (
                <SessionRow key={session.id} session={session} onDelete={deleteLocal} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
