function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export const LETTER_UI = {
  bodyFontSize: parseNumber(import.meta.env.VITE_LETTER_BODY_FONT_SIZE, 17),
  bodyFontSizeMd: parseNumber(import.meta.env.VITE_LETTER_BODY_FONT_SIZE_MD, 18),
  lineHeight: parseNumber(import.meta.env.VITE_LETTER_LINE_HEIGHT, 1.95),
  composeFlowerOpacity: parseNumber(import.meta.env.VITE_FLOWER_OPACITY_COMPOSE, 0.62),
  previewFlowerOpacity: parseNumber(import.meta.env.VITE_FLOWER_OPACITY_PREVIEW, 0.3),
  readingFlowerOpacity: parseNumber(import.meta.env.VITE_FLOWER_OPACITY_READING, 0.28),
  maxFlowers: Math.max(1, Math.round(parseNumber(import.meta.env.VITE_MAX_FLOWERS, 50))),
  typewriterMinMs: parseNumber(import.meta.env.VITE_TYPEWRITER_MIN_MS, 14),
  typewriterMaxMs: parseNumber(import.meta.env.VITE_TYPEWRITER_MAX_MS, 26),
  typewriterBoostAfterMs: parseNumber(import.meta.env.VITE_TYPEWRITER_BOOST_AFTER_MS, 900),
  typewriterBoostFactor: parseNumber(import.meta.env.VITE_TYPEWRITER_BOOST_FACTOR, 0.72),
  draftTtlMs: parseNumber(import.meta.env.VITE_DRAFT_TTL_MS, 24 * 60 * 60 * 1000),
  draftSaveIntervalMs: parseNumber(import.meta.env.VITE_DRAFT_SAVE_INTERVAL_MS, 2000),
} as const;
