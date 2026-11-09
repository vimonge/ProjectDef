/** Colours and sizes shared by every screen. High contrast for bright site conditions. */

export const C = {
  ground: '#F5F4F0',
  card: '#FFFFFF',
  line: '#E2E0DA',
  lineStrong: '#B9B5AC',
  ink: '#15171C',
  inkSoft: '#4A4F5C',
  muted: '#5B6070',
  onInk: '#FFFFFF',
  onInkMuted: '#B4B9C5',
  inkRaised: '#23262E',
  inkLine: '#343842',
  accent: '#1D4ED8',
  chip: '#D9F99D',
  rec: '#E11D48',
  recSoft: '#FECDD3',
  recText: '#BE123C',
  warnBg: '#FFF7ED',
  warnLine: '#FDBA74',
  warnText: '#9A3412',
} as const;

/** Minimum touch target. Sites mean gloves, dust and one hand. */
export const TOUCH = 48;
