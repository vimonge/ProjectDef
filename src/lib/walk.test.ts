import { describe, expect, it } from 'vitest';

import { dragToMark, fitRect, markToBox, walkOrder } from './walk';

describe('walkOrder', () => {
  it('follows the path from the door, then the order said', () => {
    const defects = [
      { zone: 'Window', seq: 1 },
      { zone: 'Bathroom', seq: 5 },
      { zone: 'Entry', seq: 9 },
      { zone: 'Bathroom', seq: 2 },
    ];
    expect(walkOrder(defects)).toEqual([
      { zone: 'Entry', seq: 9 },
      { zone: 'Bathroom', seq: 2 },
      { zone: 'Bathroom', seq: 5 },
      { zone: 'Window', seq: 1 },
    ]);
  });

  it('puts General last and an unknown zone just before it', () => {
    const order = walkOrder([
      { zone: 'General', seq: 1 },
      { zone: 'Balcony', seq: 2 },
      { zone: 'Entry', seq: 3 },
    ]);
    expect(order.map((d) => d.zone)).toEqual(['Entry', 'Balcony', 'General']);
  });

  it('leaves the original array alone', () => {
    const defects = [
      { zone: 'Window', seq: 1 },
      { zone: 'Entry', seq: 2 },
    ];
    walkOrder(defects);
    expect(defects[0].zone).toBe('Window');
  });
});

describe('fitRect', () => {
  it('letterboxes a landscape photo in a portrait box', () => {
    expect(fitRect(400, 200, 100, 100)).toEqual({ x: 0, y: 25, w: 100, h: 50 });
  });

  it('pillarboxes a portrait photo in a landscape box', () => {
    expect(fitRect(200, 400, 100, 100)).toEqual({ x: 25, y: 0, w: 50, h: 100 });
  });

  it('survives a zero-sized photo or box', () => {
    expect(fitRect(0, 0, 100, 100)).toEqual({ x: 0, y: 0, w: 100, h: 100 });
  });
});

describe('dragToMark', () => {
  const fit = { x: 0, y: 25, w: 100, h: 50 };

  const round = (r: { x: number; y: number; w: number; h: number } | null) =>
    r && {
      x: +r.x.toFixed(4),
      y: +r.y.toFixed(4),
      w: +r.w.toFixed(4),
      h: +r.h.toFixed(4),
    };

  it('turns a drag into photo coordinates, whichever way it was drawn', () => {
    const a = dragToMark({ x: 20, y: 35 }, { x: 60, y: 60 }, fit);
    const b = dragToMark({ x: 60, y: 60 }, { x: 20, y: 35 }, fit);
    expect(round(a)).toEqual({ x: 0.2, y: 0.2, w: 0.4, h: 0.5 });
    expect(round(b)).toEqual(round(a));
  });

  it('clamps a drag that runs off the photo', () => {
    expect(dragToMark({ x: -50, y: -50 }, { x: 500, y: 500 }, fit)).toEqual({ x: 0, y: 0, w: 1, h: 1 });
  });

  it('ignores a tap', () => {
    expect(dragToMark({ x: 40, y: 40 }, { x: 41, y: 40.5 }, fit)).toBeNull();
  });

  it('round-trips back to the same box rectangle', () => {
    const mark = dragToMark({ x: 20, y: 35 }, { x: 60, y: 60 }, fit)!;
    expect(round(markToBox(mark, fit))).toEqual({ x: 20, y: 35, w: 40, h: 25 });
  });
});
