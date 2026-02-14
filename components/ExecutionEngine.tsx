'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Protocol, LogEntry } from '@/lib/types';
import { useSessionStore } from '@/lib/store/sessionStore';
import { AudioEngine } from '@/lib/audioEngine';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Play, Pause, Square, SkipForward, CheckCircle2 } from 'lucide-react';
import { cn, formatMs } from '@/lib/utils';
import { useRouter } from 'next/navigation';

type Phase =
  | 'idle'
  | 'countdown'
  | 'active'
  | 'rest'
  | 'paused'
  | 'done';

interface ExecutionState {
  phase: Phase;
  movementIndex: number;
  rep: number;
  timeRemainingMs: number;
  pausedPhase: Phase | null;
}

interface ExecutionEngineProps {
  protocol: Protocol;
}

const phaseColors: Record<Phase, string> = {
  idle: 'text-muted-foreground',
  countdown: 'text-yellow-400',
  active: 'text-green-400',
  rest: 'text-blue-400',
  paused: 'text-orange-400',
  done: 'text-primary',
};

const phaseBg: Record<Phase, string> = {
  idle: 'bg-muted/20',
  countdown: 'bg-yellow-500/10',
  active: 'bg-green-500/10',
  rest: 'bg-blue-500/10',
  paused: 'bg-orange-500/10',
  done: 'bg-primary/10',
};

const phaseLabels: Record<Phase, string> = {
  idle: 'READY',
  countdown: 'STARTING IN',
  active: 'ACTIVE',
  rest: 'REST',
  paused: 'PAUSED',
  done: 'COMPLETE',
};

export default function ExecutionEngine({ protocol }: ExecutionEngineProps) {
  const router = useRouter();
  const { addSession } = useSessionStore();
  const useAudio = protocol.settings.audio_cues;

  const [state, setState] = useState<ExecutionState>({
    phase: 'idle',
    movementIndex: 0,
    rep: 1,
    timeRemainingMs: protocol.settings.countdown_before_start_ms || 3000,
    pausedPhase: null,
  });

  const sessionStartRef = useRef<string | null>(null);
  const logsRef = useRef<LogEntry[]>([]);
  const currentMovementStartRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTickRef = useRef<number | null>(null);
  const lastBeepSecRef = useRef<number>(-1);

  const movements = protocol.movements;
  const currentMovement = movements[state.movementIndex];

  // Advance to next step
  const advance = useCallback((currentState: ExecutionState): ExecutionState => {
    const { movementIndex, rep } = currentState;
    const movement = movements[movementIndex];

    // After active phase - check if there are more reps
    if (currentState.phase === 'active') {
      // Log this rep
      if (currentMovementStartRef.current !== null) {
        const now = Date.now();
        logsRef.current.push({
          movement_id: movement.id,
          movement_name: movement.name,
          rep,
          started_at: new Date(currentMovementStartRef.current).toISOString(),
          ended_at: new Date(now).toISOString(),
        });
        currentMovementStartRef.current = null;
      }

      if (rep < movement.repetitions) {
        // More reps: go to rest
        if (useAudio) AudioEngine.rest();
        return {
          ...currentState,
          phase: 'rest',
          rep,
          timeRemainingMs: protocol.settings.rest_between_reps_ms,
        };
      } else {
        // No more reps: next movement or done
        const nextIndex = movementIndex + 1;
        if (nextIndex < movements.length) {
          if (useAudio) AudioEngine.nextMovement();
          currentMovementStartRef.current = Date.now();
          return {
            ...currentState,
            phase: 'active',
            movementIndex: nextIndex,
            rep: 1,
            timeRemainingMs: movements[nextIndex].duration_ms,
          };
        } else {
          // Done
          if (useAudio) AudioEngine.complete();
          return { ...currentState, phase: 'done', timeRemainingMs: 0 };
        }
      }
    }

    // After rest phase - next rep
    if (currentState.phase === 'rest') {
      if (useAudio) AudioEngine.start();
      currentMovementStartRef.current = Date.now();
      return {
        ...currentState,
        phase: 'active',
        rep: rep + 1,
        timeRemainingMs: movement.duration_ms,
      };
    }

    // After countdown - start first movement
    if (currentState.phase === 'countdown') {
      if (useAudio) AudioEngine.start();
      currentMovementStartRef.current = Date.now();
      return {
        ...currentState,
        phase: 'active',
        movementIndex: 0,
        rep: 1,
        timeRemainingMs: movements[0].duration_ms,
      };
    }

    return currentState;
  }, [movements, protocol.settings, useAudio]);

  // Timer tick using requestAnimationFrame for precision
  const tick = useCallback((timestamp: number) => {
    if (lastTickRef.current === null) {
      lastTickRef.current = timestamp;
    }

    const delta = timestamp - lastTickRef.current;
    lastTickRef.current = timestamp;

    setState((prev) => {
      if (prev.phase === 'paused' || prev.phase === 'idle' || prev.phase === 'done') {
        return prev;
      }

      const newRemaining = prev.timeRemainingMs - delta;

      // Audio tick every second
      if (useAudio && prev.phase === 'active') {
        const secRemaining = Math.ceil(newRemaining / 1000);
        if (secRemaining !== lastBeepSecRef.current && secRemaining > 0 && secRemaining <= 3) {
          lastBeepSecRef.current = secRemaining;
          AudioEngine.countdown();
        }
      }
      if (useAudio && prev.phase === 'countdown') {
        const secRemaining = Math.ceil(newRemaining / 1000);
        if (secRemaining !== lastBeepSecRef.current && secRemaining > 0) {
          lastBeepSecRef.current = secRemaining;
          AudioEngine.countdown();
        }
      }

      if (newRemaining <= 0) {
        return advance({ ...prev, timeRemainingMs: 0 });
      }

      return { ...prev, timeRemainingMs: newRemaining };
    });

    rafRef.current = requestAnimationFrame(tick);
  }, [advance, useAudio]);

  // Start/resume the loop
  const startLoop = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    lastTickRef.current = null;
    lastBeepSecRef.current = -1;
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopLoop = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => stopLoop();
  }, [stopLoop]);

  // Save session when done
  useEffect(() => {
    if (state.phase === 'done' && sessionStartRef.current) {
      addSession({
        protocol_id: protocol.id,
        protocol_name: protocol.name,
        start_time: sessionStartRef.current,
        end_time: new Date().toISOString(),
        logs: logsRef.current,
        status: 'completed',
      });
      sessionStartRef.current = null;
    }
  }, [state.phase, protocol, addSession]);

  const handleStart = () => {
    sessionStartRef.current = new Date().toISOString();
    logsRef.current = [];
    lastBeepSecRef.current = -1;

    const hasCountdown = protocol.settings.countdown_before_start_ms > 0;
    setState({
      phase: hasCountdown ? 'countdown' : 'active',
      movementIndex: 0,
      rep: 1,
      timeRemainingMs: hasCountdown
        ? protocol.settings.countdown_before_start_ms
        : movements[0].duration_ms,
      pausedPhase: null,
    });

    if (!hasCountdown) {
      currentMovementStartRef.current = Date.now();
      if (useAudio) AudioEngine.start();
    }

    startLoop();
  };

  const handlePause = () => {
    stopLoop();
    setState((prev) => ({
      ...prev,
      pausedPhase: prev.phase,
      phase: 'paused',
    }));
  };

  const handleResume = () => {
    setState((prev) => ({
      ...prev,
      phase: prev.pausedPhase ?? 'active',
      pausedPhase: null,
    }));
    startLoop();
  };

  const handleAbort = () => {
    stopLoop();
    if (useAudio) AudioEngine.abort();
    if (sessionStartRef.current) {
      addSession({
        protocol_id: protocol.id,
        protocol_name: protocol.name,
        start_time: sessionStartRef.current,
        end_time: new Date().toISOString(),
        logs: logsRef.current,
        status: 'aborted',
      });
      sessionStartRef.current = null;
    }
    router.push(`/protocols/${protocol.id}`);
  };

  const handleSkip = () => {
    setState((prev) => advance({ ...prev, timeRemainingMs: 0 }));
  };

  // Progress calculation
  const totalMs = (() => {
    const { phase, movementIndex, rep } = state;
    const movement = movements[movementIndex];
    if (!movement) return 1;
    if (phase === 'countdown') return protocol.settings.countdown_before_start_ms;
    if (phase === 'active') return movement.duration_ms;
    if (phase === 'rest') return protocol.settings.rest_between_reps_ms;
    return 1;
  })();

  const progressPct = state.phase === 'done' ? 100 : Math.max(0, Math.min(100, ((totalMs - state.timeRemainingMs) / totalMs) * 100));

  // Overall progress
  const totalMovements = movements.reduce((sum, m) => sum + m.repetitions, 0);
  const completedReps = movements.slice(0, state.movementIndex).reduce((sum, m) => sum + m.repetitions, 0) + (state.rep - 1);
  const overallPct = totalMovements > 0 ? (completedReps / totalMovements) * 100 : 0;

  return (
    <div className={cn('min-h-screen flex flex-col items-center justify-center transition-colors duration-500', phaseBg[state.phase])}>
      {/* Phase label */}
      <div className={cn('text-xs font-bold tracking-widest uppercase mb-2 transition-colors', phaseColors[state.phase])}>
        {phaseLabels[state.phase]}
      </div>

      {/* Main movement name */}
      {state.phase !== 'idle' && state.phase !== 'done' && currentMovement && (
        <h1 className="text-4xl md:text-6xl font-black text-center mb-2 leading-tight">
          {state.phase === 'rest' ? 'REST' : currentMovement.name}
        </h1>
      )}

      {state.phase === 'done' && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <CheckCircle2 className="h-20 w-20 text-primary" />
          <h1 className="text-4xl font-black">Protocol Complete!</h1>
          <p className="text-muted-foreground">
            {logsRef.current.length} movements logged
          </p>
          <div className="flex gap-3">
            <Button onClick={() => router.push(`/protocols/${protocol.id}`)}>
              View Results
            </Button>
            <Button variant="outline" onClick={handleStart}>
              Run Again
            </Button>
          </div>
        </div>
      )}

      {state.phase === 'idle' && (
        <div className="flex flex-col items-center gap-4 mb-8">
          <h1 className="text-3xl font-black text-center">{protocol.name}</h1>
          <p className="text-muted-foreground text-center max-w-sm">
            {movements.length} movements • {movements.reduce((s, m) => s + m.repetitions, 0)} total reps
          </p>
          <Button size="lg" onClick={handleStart} className="gap-2 text-lg px-8 py-6 rounded-xl">
            <Play className="h-5 w-5" />
            Start Protocol
          </Button>
        </div>
      )}

      {/* Timer */}
      {(state.phase === 'active' || state.phase === 'rest' || state.phase === 'countdown' || state.phase === 'paused') && (
        <div className="flex flex-col items-center gap-6 w-full max-w-md px-4">
          {/* Big timer */}
          <div className={cn('text-8xl md:text-9xl font-black tabular-nums transition-colors', phaseColors[state.phase])}>
            {formatMs(state.timeRemainingMs)}
          </div>

          {/* Rep counter */}
          {state.phase !== 'countdown' && currentMovement && (
            <div className="text-lg text-muted-foreground">
              Rep <span className="font-bold text-foreground">{state.rep}</span> of{' '}
              <span className="font-bold text-foreground">{currentMovement.repetitions}</span>
            </div>
          )}

          {/* Muscle group */}
          {state.phase === 'active' && currentMovement?.muscle_group && (
            <div className="text-sm text-muted-foreground uppercase tracking-widest">
              {currentMovement.muscle_group}
            </div>
          )}

          {/* Instructions */}
          {state.phase === 'active' && currentMovement?.instructions && (
            <p className="text-sm text-muted-foreground text-center italic max-w-xs">
              {currentMovement.instructions}
            </p>
          )}

          {/* Progress bar */}
          <Progress value={progressPct} className="w-full h-3 rounded-full" />

          {/* Controls */}
          <div className="flex items-center gap-3">
            {state.phase === 'paused' ? (
              <Button size="lg" onClick={handleResume} className="gap-2">
                <Play className="h-5 w-5" />
                Resume
              </Button>
            ) : (
              <Button size="lg" variant="outline" onClick={handlePause} className="gap-2">
                <Pause className="h-5 w-5" />
                Pause
              </Button>
            )}
            <Button
              size="lg"
              variant="ghost"
              onClick={handleSkip}
              title="Skip current phase"
              className="gap-2"
            >
              <SkipForward className="h-5 w-5" />
              Skip
            </Button>
            <Button
              size="lg"
              variant="destructive"
              onClick={handleAbort}
              className="gap-2"
            >
              <Square className="h-5 w-5" />
              Abort
            </Button>
          </div>
        </div>
      )}

      {/* Overall progress */}
      {state.phase !== 'idle' && state.phase !== 'done' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 w-full max-w-xs px-4">
          <div className="flex justify-between w-full text-xs text-muted-foreground">
            <span>Overall Progress</span>
            <span>{completedReps} / {totalMovements} reps</span>
          </div>
          <Progress value={overallPct} className="w-full h-1.5 rounded-full" />
        </div>
      )}

      {/* Movement timeline (sidebar) */}
      {state.phase !== 'idle' && state.phase !== 'done' && (
        <div className="fixed right-4 top-1/2 -translate-y-1/2 hidden lg:flex flex-col gap-1.5 max-h-[60vh] overflow-y-auto">
          {movements.map((m, i) => (
            <div
              key={m.id}
              className={cn(
                'w-2 h-6 rounded-full transition-all',
                i < state.movementIndex
                  ? 'bg-primary'
                  : i === state.movementIndex
                  ? 'bg-primary h-8 w-3'
                  : 'bg-muted'
              )}
              title={m.name}
            />
          ))}
        </div>
      )}
    </div>
  );
}
