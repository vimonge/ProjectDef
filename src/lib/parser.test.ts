import { describe, expect, it } from 'vitest';

import { formatTitle, parseChunk, parseUtterance, splitUtterance } from './parser';

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
