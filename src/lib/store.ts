/**
 * Local data for the prototype: rooms and their draft defects, saved on
 * the phone so nothing is lost without signal. This will move to SQLite
 * once photos and plans are added; the shapes are meant to carry over.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { ParsedDefect } from './parser';

export type Room = {
  id: string;
  /** As printed on the plan, e.g. "1008". */
  number: string;
  /** Room type, e.g. "RT1A King". Optional for now. */
  type: string;
  createdAt: number;
};

export type DefectStatus = 'draft';

export type Defect = {
  id: string;
  roomId: string;
  /** Running number within the room, starting at 1. */
  seq: number;
  issue: string;
  detail: string;
  zone: string;
  trade: string;
  /** The words as heard. */
  raw: string;
  status: DefectStatus;
  createdAt: number;
};

export type DefectEdit = Partial<Pick<Defect, 'issue' | 'detail' | 'zone' | 'trade'>>;

type State = {
  rooms: Room[];
  defects: Defect[];
  addRoom: (number: string, type: string) => Room;
  removeRoom: (roomId: string) => void;
  addDefects: (roomId: string, parsed: ParsedDefect[]) => void;
  updateDefect: (defectId: string, edit: DefectEdit) => void;
  removeDefect: (defectId: string) => void;
};

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      rooms: [],
      defects: [],

      addRoom: (number, type) => {
        const room: Room = { id: newId(), number: number.trim(), type: type.trim(), createdAt: Date.now() };
        set((s) => ({ rooms: [...s.rooms, room] }));
        return room;
      },

      removeRoom: (roomId) =>
        set((s) => ({
          rooms: s.rooms.filter((r) => r.id !== roomId),
          defects: s.defects.filter((d) => d.roomId !== roomId),
        })),

      addDefects: (roomId, parsed) => {
        if (parsed.length === 0) return;
        const lastSeq = get()
          .defects.filter((d) => d.roomId === roomId)
          .reduce((max, d) => Math.max(max, d.seq), 0);
        const now = Date.now();
        const added: Defect[] = parsed.map((p, i) => ({
          id: newId(),
          roomId,
          seq: lastSeq + i + 1,
          issue: p.issue,
          detail: p.detail,
          zone: p.zone,
          trade: p.trade,
          raw: p.raw,
          status: 'draft',
          createdAt: now,
        }));
        set((s) => ({ defects: [...s.defects, ...added] }));
      },

      updateDefect: (defectId, edit) =>
        set((s) => ({
          defects: s.defects.map((d) => (d.id === defectId ? { ...d, ...edit } : d)),
        })),

      removeDefect: (defectId) => set((s) => ({ defects: s.defects.filter((d) => d.id !== defectId) })),
    }),
    {
      name: 'projectdef-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ rooms: s.rooms, defects: s.defects }),
    },
  ),
);
