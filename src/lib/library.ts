/**
 * The vocabulary the voice sweep understands.
 *
 * Everything here is plain data so it can later be edited per project
 * (each builder words things differently) without touching the parser.
 * Aliases are matched as whole words, lower case, longest match wins.
 */

export type IssueDef = {
  /** Canonical name used in the defect title. */
  name: string;
  /** Spoken variations that should map to this issue. */
  aliases: string[];
  /** Trade that normally fixes it. Left out when it depends on the item. */
  trade?: string;
};

export type KeywordGroup = {
  name: string;
  keywords: string[];
};

export const ISSUES: IssueDef[] = [
  {
    name: 'Paint marks',
    aliases: ['paint marks', 'paint mark', 'paint splatter', 'paint splatters', 'paint drips', 'paint drip', 'overpaint', 'paint spots'],
    trade: 'Painter',
  },
  {
    name: 'Excess paint',
    aliases: ['excessive painting', 'excessive paint', 'excess paint', 'overpainting', 'too much paint', 'paint runs', 'paint run'],
    trade: 'Painter',
  },
  {
    name: 'Paint touch-up',
    aliases: ['paint touch up', 'touch up', 'touch ups', 'patchy paint', 'paint patchy', 'needs paint', 'needs painting', 'paint missing', 'missed paint'],
    trade: 'Painter',
  },
  {
    name: 'Scuff marks',
    aliases: ['scuff marks', 'scuff mark', 'scuffs', 'scuffed', 'scuff'],
    trade: 'Painter',
  },
  { name: 'Marks', aliases: ['excessive marks', 'marks', 'marked', 'mark'], trade: 'Painter' },
  { name: 'Scratch', aliases: ['scratches', 'scratched', 'scratch'] },
  { name: 'Chip', aliases: ['chipped', 'chips', 'chip'] },
  { name: 'Dent', aliases: ['dented', 'dents', 'dent'] },
  { name: 'Crack', aliases: ['cracked', 'cracks', 'crack'] },
  {
    name: 'Silicone missing',
    aliases: ['silicone missing', 'missing silicone', 'no silicone', 'needs silicone', 'silicone incomplete', 'incomplete silicone', 'silicone gap', 'silicone'],
    trade: 'Caulker',
  },
  {
    name: 'Grout incomplete',
    aliases: ['grout incomplete', 'incomplete grout', 'grout missing', 'missing grout', 'no grout', 'needs grout', 'grout'],
    trade: 'Tiler',
  },
  {
    name: 'Not closing properly',
    aliases: ['not closing properly', 'not closing', 'does not close', "doesn't close", 'doesnt close', "won't close", 'wont close', 'not shutting', 'not latching', 'sticking'],
    trade: 'Joiner',
  },
  {
    name: 'Finish install',
    aliases: ['finish install', 'finish installation', 'finish installing', 'incomplete install', 'install incomplete', 'not installed', 'needs installing', 'not finished'],
  },
  {
    name: 'Not working',
    aliases: ['not working', 'does not work', "doesn't work", 'doesnt work', 'not functioning', 'faulty'],
  },
  { name: 'Loose', aliases: ['loose', 'wobbly', 'coming off'] },
  {
    name: 'Misaligned',
    aliases: ['misaligned', 'not aligned', 'out of alignment', 'crooked', 'not level', 'not straight', 'uneven'],
  },
  { name: 'Gap', aliases: ['gaps', 'gap'] },
  { name: 'Leak', aliases: ['leaking', 'leaks', 'leak', 'dripping'], trade: 'Plumber' },
  {
    name: 'Needs cleaning',
    aliases: ['needs a general clean', 'need a general clean', 'general cleaning', 'general clean', 'excessive dirt', 'needs cleaning', 'needs a clean', 'needs clean', 'dirty', 'dirt', 'dusty', 'dust', 'stained', 'stains', 'stain', 'glue residue', 'residue', 'sticker left', 'stickers'],
    trade: 'Cleaner',
  },
  { name: 'Damaged', aliases: ['damaged', 'damage', 'broken'] },
  { name: 'Missing', aliases: ['missing', 'not there'] },
];

/** Trades you can name out loud ("…, painter"). */
export const TRADES: KeywordGroup[] = [
  { name: 'Painter', keywords: ['painter', 'painters', 'painting'] },
  { name: 'Joiner', keywords: ['joiner', 'joiners', 'joinery', 'carpenter', 'carpenters', 'chippy'] },
  { name: 'Tiler', keywords: ['tiler', 'tilers'] },
  { name: 'Plumber', keywords: ['plumber', 'plumbers', 'plumbing'] },
  { name: 'Electrician', keywords: ['electrician', 'electricians', 'electrical', 'sparky'] },
  { name: 'Glazier', keywords: ['glazier', 'glaziers', 'glazing'] },
  { name: 'Caulker', keywords: ['caulker', 'caulkers', 'caulking'] },
  { name: 'Plasterer', keywords: ['plasterer', 'plasterers', 'gyprocker'] },
  { name: 'Flooring', keywords: ['flooring', 'carpet layer', 'floor layer'] },
  { name: 'Cleaner', keywords: ['cleaner', 'cleaners', 'cleaning'] },
  { name: 'Builder', keywords: ['builder', 'builders'] },
];

/**
 * When the issue itself doesn't decide the trade ("scratch", "chip"),
 * the item it is on usually does.
 */
export const ITEM_TRADES: KeywordGroup[] = [
  { name: 'Tiler', keywords: ['tile', 'tiles', 'tiling'] },
  { name: 'Glazier', keywords: ['mirror', 'glass', 'shower screen', 'window'] },
  {
    name: 'Joiner',
    keywords: ['door', 'doors', 'wardrobe', 'robe', 'drawer', 'drawers', 'shelf', 'shelves', 'cabinet', 'cupboard', 'joinery', 'bedhead', 'headboard', 'desk', 'bench', 'benchtop', 'handle', 'hinge', 'skirting', 'skirt'],
  },
  {
    name: 'Electrician',
    keywords: ['light', 'lights', 'lamp', 'switch', 'power point', 'powerpoint', 'gpo', 'outlet', 'downlight', 'thermostat', 'tv', 'television'],
  },
  {
    name: 'Plumber',
    keywords: ['tap', 'taps', 'toilet', 'basin', 'sink', 'shower head', 'showerhead', 'drain', 'mixer', 'cistern'],
  },
  { name: 'Flooring', keywords: ['carpet', 'floorboard', 'floorboards', 'vinyl'] },
  { name: 'Plasterer', keywords: ['plasterboard', 'plaster', 'gyprock'] },
  { name: 'Painter', keywords: ['wall', 'walls', 'ceiling', 'cornice', 'architrave'] },
];

/**
 * Default zones for a hotel room. These become per-room-type zones once
 * floor plans are in the app; the names stay the same.
 */
export const ZONES: KeywordGroup[] = [
  {
    name: 'Bathroom',
    keywords: ['bathroom', 'ensuite', 'vanity', 'shower', 'toilet', 'basin', 'bath', 'towel rail', 'shower screen', 'cistern'],
  },
  { name: 'Entry', keywords: ['entry', 'entrance', 'front door', 'entry door', 'hallway', 'door closer', 'peephole'] },
  { name: 'Wardrobe', keywords: ['wardrobe', 'robe', 'closet', 'luggage rack', 'safe', 'minibar', 'mini bar'] },
  { name: 'Bed', keywords: ['bed', 'bedhead', 'headboard', 'bedside', 'bedside table'] },
  { name: 'Window', keywords: ['window', 'windows', 'curtain', 'curtains', 'blind', 'blinds', 'sheer', 'pelmet', 'window sill'] },
  { name: 'Desk', keywords: ['desk', 'chair', 'tv', 'television', 'tv unit'] },
  {
    name: 'Kitchen',
    keywords: ['kitchen', 'kitchenette', 'kitchen bench', 'benchtop', 'cooktop', 'oven', 'rangehood', 'fridge', 'dishwasher', 'splashback'],
  },
  { name: 'Laundry', keywords: ['laundry', 'washing machine', 'dryer'] },
];

export const DEFAULT_ZONE = 'General';
export const UNASSIGNED_TRADE = 'Unassigned';

export const ZONE_NAMES = [...ZONES.map((z) => z.name), DEFAULT_ZONE];
export const TRADE_NAMES = [...TRADES.map((t) => t.name), UNASSIGNED_TRADE];
