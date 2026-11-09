/**
 * Turns what was said during a voice sweep into draft defects.
 *
 * Runs entirely on the phone with no network: it only splits text and
 * matches words against the library. Kept free of React and Expo imports
 * so it can be unit tested on its own.
 */

import {
  DEFAULT_ZONE,
  ISSUES,
  ITEM_TRADES,
  TRADES,
  UNASSIGNED_TRADE,
  ZONES,
  type KeywordGroup,
} from './library';

export type ParsedDefect = {
  /** Canonical issue, e.g. "Paint marks". */
  issue: string;
  /** Where on the item, e.g. "behind entry door". May be empty. */
  detail: string;
  zone: string;
  trade: string;
  /** The words as heard, kept so a wrong guess can be corrected. */
  raw: string;
  /** False when nothing in the library matched and the issue is just the spoken words. */
  matched: boolean;
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Whole-word match for a phrase, tolerant of extra spaces between words. */
const phraseRe = (phrase: string, flags = '') =>
  new RegExp(`(?<![a-z0-9'])${escapeRe(phrase).replace(/ /g, '\\s+')}(?![a-z0-9'])`, flags);

function normalise(text: string): string {
  return text
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .replace(/-/g, ' ')
    .replace(/[^a-z0-9'.;\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Words that mean "that defect is done, here comes another".
 * "next" on its own counts, but "next to the window" does not.
 */
const SEPARATOR =
  /(?:[.;]+|\b(?:next (?:one|defect|item)|new defect|another one|and then|and also|also)\b|\bnext\b(?! to\b))/g;

/** One spoken stretch can hold several defects. */
export function splitUtterance(text: string): string[] {
  return normalise(text)
    .split(SEPARATOR)
    .map((part) => part.trim())
    .filter((part) => part.replace(/[^a-z0-9]/g, '').length > 1);
}

type Hit = { name: string; phrase: string; index: number };

/** Longest phrase wins; ties go to the one said first. */
function bestHit(text: string, groups: { name: string; phrases: string[] }[]): Hit | null {
  let best: Hit | null = null;
  for (const group of groups) {
    for (const phrase of group.phrases) {
      const m = phraseRe(phrase).exec(text);
      if (!m) continue;
      if (
        !best ||
        phrase.length > best.phrase.length ||
        (phrase.length === best.phrase.length && m.index < best.index)
      ) {
        best = { name: group.name, phrase, index: m.index };
      }
    }
  }
  return best;
}

const asGroups = (groups: KeywordGroup[]) =>
  groups.map((g) => ({ name: g.name, phrases: g.keywords }));

const ISSUE_GROUPS = ISSUES.map((i) => ({ name: i.name, phrases: i.aliases }));
const TRADE_GROUPS = asGroups(TRADES);
const ITEM_TRADE_GROUPS = asGroups(ITEM_TRADES);
const ZONE_GROUPS = asGroups(ZONES);

const LEADING_FILLER =
  /^(?:(?:and|um|uh|er|so|okay|ok|then|there's|theres|there is|there are|we have|we've got|weve got|got|has|have|a|an|the|some|is|are|on|at|in|to|of|for|with)\s+)+/;
const TRAILING_FILLER =
  /(?:\s+(?:and|is|are|has|have|needs|need|with|on|at|in|the|a|for|to|of|by))+$/;

function tidy(text: string): string {
  let out = text.replace(/\s+/g, ' ').trim();
  let prev: string;
  do {
    prev = out;
    out = out.replace(LEADING_FILLER, '').replace(TRAILING_FILLER, '').trim();
  } while (out !== prev);
  // Nothing but a filler word left ("um", "and") means nothing was said.
  return LEADING_FILLER.test(`${out} `) && !/\s/.test(out) ? '' : out;
}

const sentenceCase = (s: string) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** Parse one already-split chunk into a draft defect. */
export function parseChunk(chunk: string): ParsedDefect {
  const raw = chunk.trim();
  let text = normalise(raw).replace(/[.;]/g, ' ').trim();

  // 1. A trade named at the end ("…, painter" / "… for the joiner") is an instruction, not part of the defect.
  let spokenTrade: string | null = null;
  for (const group of TRADE_GROUPS) {
    for (const phrase of group.phrases) {
      const tail = new RegExp(`(?:\\s+|^)(?:(?:for|to)\\s+)?(?:the\\s+)?${escapeRe(phrase)}$`);
      if (tail.test(text)) {
        spokenTrade = group.name;
        text = text.replace(tail, '').trim();
        break;
      }
    }
    if (spokenTrade) break;
  }
  // A trade mentioned mid-sentence still sets the trade but stays in the wording.
  const mentionedTrade = spokenTrade ?? bestHit(text, TRADE_GROUPS)?.name ?? null;

  // 2. Zone and item are read before the issue words are removed.
  const zone = bestHit(text, ZONE_GROUPS)?.name ?? DEFAULT_ZONE;
  const itemTrade = bestHit(text, ITEM_TRADE_GROUPS)?.name ?? null;

  // 3. Issue from the library; whatever is left over is the location detail.
  const hit = bestHit(text, ISSUE_GROUPS);
  if (!hit) {
    return {
      issue: sentenceCase(tidy(text)),
      detail: '',
      zone,
      trade: mentionedTrade ?? itemTrade ?? UNASSIGNED_TRADE,
      raw,
      matched: false,
    };
  }

  const issueDef = ISSUES.find((i) => i.name === hit.name)!;
  const detail = tidy(text.replace(phraseRe(hit.phrase), ' '));

  return {
    issue: issueDef.name,
    detail,
    zone,
    trade: mentionedTrade ?? issueDef.trade ?? itemTrade ?? UNASSIGNED_TRADE,
    raw,
    matched: true,
  };
}

/** Everything said in one stretch → zero or more draft defects. */
export function parseUtterance(text: string): ParsedDefect[] {
  return splitUtterance(text)
    .map(parseChunk)
    .filter((d) => d.issue.length > 0);
}

/** "1008 - Paint marks - behind entry door": room number first, as builders ask for it. */
export function formatTitle(roomNumber: string, issue: string, detail: string): string {
  return [roomNumber, issue, detail].filter((p) => p && p.trim()).join(' - ');
}
