/**
 * Pure helpers for the photo pass. No React or Expo imports, so they can be
 * unit tested on their own.
 */

import type { Defect } from './store';

/**
 * The order a room is walked, so the photo pass does not send you back and
 * forth. Roughly the path from the door: entry, then the bathroom off it,
 * then along the room to the window.
 */
export const WALK_ORDER = [
  'Entry',
  'Bathroom',
  'Wardrobe',
  'Kitchen',
  'Laundry',
  'Bed',
  'Desk',
  'Window',
  'General',
];

const rank = (zone: string) => {
  const i = WALK_ORDER.indexOf(zone);
  // An unknown zone sorts after the known ones but before General.
  return i === -1 ? WALK_ORDER.length - 1.5 : i;
};

/** Defects in walking order; within a zone, the order they were said. */
export function walkOrder<T extends Pick<Defect, 'zone' | 'seq'>>(defects: T[]): T[] {
  return [...defects].sort((a, b) => rank(a.zone) - rank(b.zone) || a.seq - b.seq);
}

export type Rect = { x: number; y: number; w: number; h: number };

/**
 * Where a photo actually sits inside its box when scaled to fit (letterboxed).
 * Marks are stored relative to the photo, not the box, so they stay put on a
 * phone held differently or a report page of another size.
 */
export function fitRect(photoW: number, photoH: number, boxW: number, boxH: number): Rect {
  if (photoW <= 0 || photoH <= 0 || boxW <= 0 || boxH <= 0) return { x: 0, y: 0, w: boxW, h: boxH };
  const scale = Math.min(boxW / photoW, boxH / photoH);
  const w = photoW * scale;
  const h = photoH * scale;
  return { x: (boxW - w) / 2, y: (boxH - h) / 2, w, h };
}

const clamp01 = (n: number) => (Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 0);

/** A drag in box coordinates becomes a rectangle in photo coordinates (0 to 1). */
export function dragToMark(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fit: Rect,
): Rect | null {
  if (fit.w <= 0 || fit.h <= 0) return null;
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return null;
  const x1 = clamp01((Math.min(from.x, to.x) - fit.x) / fit.w);
  const x2 = clamp01((Math.max(from.x, to.x) - fit.x) / fit.w);
  const y1 = clamp01((Math.min(from.y, to.y) - fit.y) / fit.h);
  const y2 = clamp01((Math.max(from.y, to.y) - fit.y) / fit.h);
  const w = x2 - x1;
  const h = y2 - y1;
  // A tap rather than a drag: too small to mean anything.
  if (w < 0.02 || h < 0.02) return null;
  return { x: x1, y: y1, w, h };
}

/** A stored mark back to box coordinates for drawing. */
export function markToBox(mark: Rect, fit: Rect): Rect {
  return {
    x: fit.x + mark.x * fit.w,
    y: fit.y + mark.y * fit.h,
    w: mark.w * fit.w,
    h: mark.h * fit.h,
  };
}
