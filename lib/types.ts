export type MovementType = 'contraction' | 'rest' | 'transition';

export interface Movement {
  id: string;
  name: string;
  muscle_group: string;
  type: MovementType;
  duration_ms: number;
  repetitions: number;
  instructions?: string;
}

export interface ProtocolSettings {
  rest_between_reps_ms: number;
  countdown_before_start_ms: number;
  audio_cues: boolean;
}

export interface Protocol {
  id: string;
  name: string;
  description: string;
  created_at: string;
  movements: Movement[];
  settings: ProtocolSettings;
}

export interface LogEntry {
  movement_id: string;
  movement_name: string;
  rep: number;
  started_at: string;
  ended_at: string;
}

export type SessionStatus = 'completed' | 'aborted';

export interface Session {
  id: string;
  protocol_id: string;
  protocol_name: string;
  start_time: string;
  end_time: string;
  logs: LogEntry[];
  status: SessionStatus;
}

export type ExecutionPhase = 'idle' | 'countdown' | 'running' | 'paused' | 'done';

export interface ExecutionState {
  phase: ExecutionPhase;
  current_movement_index: number;
  current_rep: number;
  time_remaining_ms: number;
  elapsed_ms: number;
}
