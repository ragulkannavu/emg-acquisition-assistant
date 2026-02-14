'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, LogEntry, SessionStatus } from '@/lib/types';
import { nanoid } from '@/lib/utils';

interface SessionStore {
  sessions: Session[];
  addSession: (session: Omit<Session, 'id'>) => Session;
  deleteSession: (id: string) => void;
  getSessionsForProtocol: (protocol_id: string) => Session[];
}

export const useSessionStore = create<SessionStore>()(
  persist(
    (set, get) => ({
      sessions: [],

      addSession: (session) => {
        const newSession: Session = {
          ...session,
          id: nanoid(),
        };
        set((state) => ({ sessions: [newSession, ...state.sessions] }));
        return newSession;
      },

      deleteSession: (id) => {
        set((state) => ({
          sessions: state.sessions.filter((s) => s.id !== id),
        }));
      },

      getSessionsForProtocol: (protocol_id) => {
        return get().sessions.filter((s) => s.protocol_id === protocol_id);
      },
    }),
    {
      name: 'emg-sessions',
    }
  )
);
