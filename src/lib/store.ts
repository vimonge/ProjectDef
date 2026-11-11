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
  /** True when the words matched nothing in the library, so the wording needs a look. */
  review?: boolean;
  createdAt: number;
};

export type DefectEdit = Partial<Pick<Defect, 'issue' | 'detail' | 'zone' | 'trade'>>;

export type Photo = {
  id: string;
  roomId: string;
  /** The defect it was taken for. Marks can tie it to further defects as well. */
  defectId: string;
  /** file:// in the app's own storage, not the camera's temporary folder. */
  uri: string;
  width: number;
  height: number;
  createdAt: number;
};

/**
 * A circle drawn on a photo, tied to one defect. Several marks on one photo
 * is how a single shot of, say, a vanity covers three separate defects.
 * The rectangle is relative to the photo (0 to 1), not to any screen.
 */
export type Mark = {
  id: string;
  photoId: string;
  defectId: string;
  x: number;
  y: number;
  w: number;
  h: number;
};

type State = {
  rooms: Room[];
  defects: Defect[];
  photos: Photo[];
  marks: Mark[];
  addRoom: (number: string, type: string) => Room;
  removeRoom: (roomId: string) => void;
  addDefects: (roomId: string, parsed: ParsedDefect[]) => void;
  updateDefect: (defectId: string, edit: DefectEdit) => void;
  removeDefect: (defectId: string) => void;
  /** Store a photo taken for one defect, and link the two. */
  addPhoto: (input: { roomId: string; defectId: string; uri: string; width: number; height: number }) => Photo;
  /** Circle part of a photo and tie it to a defect (which may not be the one the photo was taken for). */
  addMark: (photoId: string, defectId: string, rect: Pick<Mark, 'x' | 'y' | 'w' | 'h'>) => void;
  removeMark: (markId: string) => void;
  setMarkDefect: (markId: string, defectId: string) => void;
};

/** Every photo showing this defect: the one taken for it, plus any circled for it. */
export function photosForDefect(photos: Photo[], marks: Mark[], defectId: string): Photo[] {
  const circled = new Set(marks.filter((m) => m.defectId === defectId).map((m) => m.photoId));
  return photos.filter((p) => p.defectId === defectId || circled.has(p.id));
}

let counter = 0;
const newId = () => `${Date.now().toString(36)}-${(counter++).toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

export const useStore = create<State>()(
  persist(
    (set, get) => ({
      rooms: [],
      defects: [],
      photos: [],
      marks: [],

      addRoom: (number, type) => {
        const room: Room = { id: newId(), number: number.trim(), type: type.trim(), createdAt: Date.now() };
        set((s) => ({ rooms: [...s.rooms, room] }));
        return room;
      },

      removeRoom: (roomId) =>
        set((s) => {
          const goneIds = new Set(s.photos.filter((p) => p.roomId === roomId).map((p) => p.id));
          return {
            rooms: s.rooms.filter((r) => r.id !== roomId),
            defects: s.defects.filter((d) => d.roomId !== roomId),
            photos: s.photos.filter((p) => p.roomId !== roomId),
            marks: s.marks.filter((m) => !goneIds.has(m.photoId)),
          };
        }),

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
          review: !p.matched,
          createdAt: now,
        }));
        set((s) => ({ defects: [...s.defects, ...added] }));
      },

      updateDefect: (defectId, edit) =>
        set((s) => ({
          // Saving an edit means a person has checked it.
          defects: s.defects.map((d) => (d.id === defectId ? { ...d, ...edit, review: false } : d)),
        })),

      removeDefect: (defectId) =>
        set((s) => ({
          defects: s.defects.filter((d) => d.id !== defectId),
          // The photo file is left on disk: it may still be circled for another defect.
          photos: s.photos.filter((p) => p.defectId !== defectId),
          marks: s.marks.filter((m) => m.defectId !== defectId),
        })),

      addPhoto: ({ roomId, defectId, uri, width, height }) => {
        const photo: Photo = { id: newId(), roomId, defectId, uri, width, height, createdAt: Date.now() };
        set((s) => ({ photos: [...s.photos, photo] }));
        return photo;
      },

      addMark: (photoId, defectId, rect) =>
        set((s) => ({ marks: [...s.marks, { id: newId(), photoId, defectId, ...rect }] })),

      removeMark: (markId) => set((s) => ({ marks: s.marks.filter((m) => m.id !== markId) })),

      setMarkDefect: (markId, defectId) =>
        set((s) => ({ marks: s.marks.map((m) => (m.id === markId ? { ...m, defectId } : m)) })),
    }),
    {
      name: 'projectdef-v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ rooms: s.rooms, defects: s.defects, photos: s.photos, marks: s.marks }),
    },
  ),
);
