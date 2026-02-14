'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Protocol, Movement, ProtocolSettings } from '@/lib/types';
import { nanoid } from '@/lib/utils';

interface ProtocolStore {
  protocols: Protocol[];
  addProtocol: (protocol: Omit<Protocol, 'id' | 'created_at'>) => Protocol;
  updateProtocol: (id: string, updates: Partial<Omit<Protocol, 'id' | 'created_at'>>) => void;
  deleteProtocol: (id: string) => void;
  getProtocol: (id: string) => Protocol | undefined;
}

const defaultSettings: ProtocolSettings = {
  rest_between_reps_ms: 2000,
  countdown_before_start_ms: 3000,
  audio_cues: true,
};

export const useProtocolStore = create<ProtocolStore>()(
  persist(
    (set, get) => ({
      protocols: [],

      addProtocol: (protocol) => {
        const newProtocol: Protocol = {
          ...protocol,
          id: nanoid(),
          created_at: new Date().toISOString(),
          settings: protocol.settings ?? defaultSettings,
        };
        set((state) => ({ protocols: [...state.protocols, newProtocol] }));
        return newProtocol;
      },

      updateProtocol: (id, updates) => {
        set((state) => ({
          protocols: state.protocols.map((p) =>
            p.id === id ? { ...p, ...updates } : p
          ),
        }));
      },

      deleteProtocol: (id) => {
        set((state) => ({
          protocols: state.protocols.filter((p) => p.id !== id),
        }));
      },

      getProtocol: (id) => {
        return get().protocols.find((p) => p.id === id);
      },
    }),
    {
      name: 'emg-protocols',
    }
  )
);
