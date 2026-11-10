import { describe, expect, it } from 'vitest';

import { formatTitle, parseChunk, parseChunks, parseUtterance, splitOnNext, splitUtterance } from './parser';

describe('splitUtterance', () => {
  it('splits on "next" but not "next to"', () => {
    expect(splitUtterance('paint marks behind door next scratch next to the window')).toEqual([
      'paint marks behind door',
      'scratch next to the window',
    ]);
  });

  it('splits on full stops and "also"', () => {
    expect(splitUtterance('Mirror scratched. Grout missing in shower also loose handle')).toEqual([
      'mirror scratched',
      'grout missing in shower',
      'loose handle',
    ]);
  });

  it('drops empty and one-letter pieces', () => {
    expect(splitUtterance('next next a next')).toEqual([]);
  });
});

describe('parseChunk', () => {
  it('reads issue, detail, zone and spoken trade', () => {
    expect(parseChunk('paint marks behind entry door, painter')).toMatchObject({
      issue: 'Paint marks',
      detail: 'behind entry door',
      zone: 'Entry',
      trade: 'Painter',
      matched: true,
    });
  });

  it('uses the issue default trade over the item', () => {
    // door would suggest Joiner, but paint marks are the painter's
    expect(parseChunk('paint marks on wardrobe door').trade).toBe('Painter');
  });

  it('falls back to the item for the trade', () => {
    expect(parseChunk('mirror scratched')).toMatchObject({
      issue: 'Scratch',
      detail: 'mirror',
      trade: 'Glazier',
    });
    expect(parseChunk('chipped tile in the shower')).toMatchObject({
      issue: 'Chip',
      detail: 'tile in the shower',
      zone: 'Bathroom',
      trade: 'Tiler',
    });
  });

  it('prefers the longest alias', () => {
    expect(parseChunk('silicone missing at vanity')).toMatchObject({
      issue: 'Silicone missing',
      detail: 'vanity',
      zone: 'Bathroom',
      trade: 'Caulker',
    });
  });

  it('handles words before the issue', () => {
    expect(parseChunk('wardrobe door not closing')).toMatchObject({
      issue: 'Not closing properly',
      detail: 'wardrobe door',
      zone: 'Wardrobe',
      trade: 'Joiner',
    });
  });

  it('strips filler around the detail', () => {
    expect(parseChunk("and there's a scuff on the bedhead left side")).toMatchObject({
      issue: 'Scuff marks',
      detail: 'bedhead left side',
      zone: 'Bed',
    });
    expect(parseChunk('the mirror is scratched').detail).toBe('mirror');
  });

  it('a spoken trade overrides the default', () => {
    expect(parseChunk('grout missing in shower for the builder')).toMatchObject({
      issue: 'Grout incomplete',
      detail: 'shower',
      trade: 'Builder',
    });
  });

  it('keeps unknown wording as the issue', () => {
    expect(parseChunk('curtain track hanging down')).toMatchObject({
      issue: 'Curtain track hanging down',
      detail: '',
      zone: 'Window',
      trade: 'Unassigned',
      matched: false,
    });
  });

  it('does not match inside other words', () => {
    // "chipboard" must not become a Chip, "gapless" not a Gap
    expect(parseChunk('chipboard exposed').matched).toBe(false);
    expect(parseChunk('gapless trim lifting').matched).toBe(false);
  });

  it('matches the Procore example wording', () => {
    expect(parseChunk('finish install')).toMatchObject({ issue: 'Finish install', detail: '' });
  });
});

describe('parseUtterance', () => {
  it('turns one stretch of speech into several drafts', () => {
    const drafts = parseUtterance(
      'paint marks behind entry door next silicone missing at vanity next mirror scratched',
    );
    expect(drafts.map((d) => d.issue)).toEqual(['Paint marks', 'Silicone missing', 'Scratch']);
  });

  it('returns nothing for silence', () => {
    expect(parseUtterance('   ')).toEqual([]);
    expect(parseUtterance('um')).toEqual([]);
  });
});

describe('formatTitle', () => {
  it('puts the room number first and skips empty parts', () => {
    expect(formatTitle('1008', 'Paint marks', 'behind entry door')).toBe(
      '1008 - Paint marks - behind entry door',
    );
    expect(formatTitle('905', 'Paint marks', '')).toBe('905 - Paint marks');
  });
});

describe('splitOnNext (voice mode)', () => {
  it('keeps unfinished words pending until "next"', () => {
    expect(splitOnNext('marks on the door')).toEqual({ done: [], rest: 'marks on the door' });
    expect(splitOnNext('marks on the door next')).toEqual({ done: ['marks on the door'], rest: '' });
    expect(splitOnNext('marks on the door next crack in')).toEqual({
      done: ['marks on the door'],
      rest: 'crack in',
    });
  });

  it('does not split on the full stops the recogniser adds at each pause', () => {
    expect(splitOnNext('Kitchen. Bench has a dent.')).toEqual({ done: [], rest: 'kitchen bench has a dent' });
  });

  it('does not split on "next to"', () => {
    expect(splitOnNext('mark next to the window next')).toEqual({ done: ['mark next to the window'], rest: '' });
  });

  it('joins pieces cut at breaths into one defect', () => {
    // As heard on the first site test: "Kitchen" / "Bench" / "has a dent" arrived separately.
    let pending = '';
    const done: string[] = [];
    for (const piece of ['kitchen', 'bench', 'has a dent', 'next', 'floor', 'is dirty next']) {
      const r = splitOnNext(`${pending} ${piece}`);
      done.push(...r.done);
      pending = r.rest;
    }
    expect(done).toEqual(['kitchen bench has a dent', 'floor is dirty']);
    expect(pending).toBe('');
    expect(parseChunks(done)).toMatchObject([
      { issue: 'Dent', detail: 'kitchen bench', zone: 'Kitchen', trade: 'Joiner' },
      { issue: 'Needs cleaning', detail: 'floor', trade: 'Cleaner' },
    ]);
  });

  it('drops filler-only chunks', () => {
    expect(parseChunks(['um', 'and'])).toEqual([]);
  });
});

describe('wording from the first site test', () => {
  it('understands marks, dirt, excess paint and plasterboard', () => {
    expect(parseChunk('door has a mark')).toMatchObject({ issue: 'Marks', detail: 'door', trade: 'Painter' });
    expect(parseChunk('entrance door has marks on the left top corner')).toMatchObject({
      issue: 'Marks',
      detail: 'entrance door on the left top corner',
      zone: 'Entry',
    });
    expect(parseChunk('excessive painting on door bottom skirting')).toMatchObject({
      issue: 'Excess paint',
      detail: 'door bottom skirting',
      trade: 'Painter',
    });
    expect(parseChunk('crack in the plasterboard on right hand side')).toMatchObject({
      issue: 'Crack',
      trade: 'Plasterer',
    });
    expect(parseChunk('general is dirt')).toMatchObject({ issue: 'Needs cleaning', trade: 'Cleaner' });
    expect(parseChunk('skirting front of the laundry has marks').zone).toBe('Laundry');
  });
});
