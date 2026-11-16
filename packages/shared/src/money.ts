/** One Bangladeshi taka is 100 paisa. Every price in the system is an integer count of these. */
export const PAISA_PER_TAKA = 100;

export type Locale = 'bn' | 'en';

/**
 * Convert a taka amount entered by a person into integer paisa.
 *
 * Rounds to the nearest paisa, because binary floating point cannot represent most decimal
 * money values exactly (0.1 + 0.2 is the obvious case). Rejects values outside the safe
 * integer range instead of quietly losing precision.
 */
export function toPaisa(taka: number): number {
  if (!Number.isFinite(taka)) {
    throw new RangeError('Taka amount must be a finite number');
  }

  const paisa = Math.round(taka * PAISA_PER_TAKA);
  if (!Number.isSafeInteger(paisa)) {
    throw new RangeError('Taka amount is outside the safe range');
  }

  return paisa;
}

/**
 * Render integer paisa for display.
 *
 * Whole amounts drop the decimals so a catalogue price reads as ৳1,200 rather than
 * ৳1,200.00. Bangla uses Bengali digits and grouping; English uses Latin digits.
 */
export function formatPaisa(paisa: number, locale: Locale = 'bn'): string {
  if (!Number.isSafeInteger(paisa)) {
    throw new RangeError('Paisa amount must be an integer');
  }

  const hasPaisa = paisa % PAISA_PER_TAKA !== 0;
  const formatter = new Intl.NumberFormat(locale === 'bn' ? 'bn-BD' : 'en-US', {
    minimumFractionDigits: hasPaisa ? 2 : 0,
    maximumFractionDigits: hasPaisa ? 2 : 0,
  });

  return `৳${formatter.format(paisa / PAISA_PER_TAKA)}`;
}
