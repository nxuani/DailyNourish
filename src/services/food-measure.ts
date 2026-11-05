// Pure helpers for amounts and units. No React in here, so it is easy to test.

export type Unit = 'serving' | 'g' | 'oz' | 'ml' | 'fl oz' | 'cup' | 'tbsp' | 'tsp';

export type Macros = { calories: number; protein: number; carbs: number; fat: number };

// How many grams (mass) or milliliters (volume) are in one of each unit.
const MASS_FACTORS: Partial<Record<Unit, number>> = { g: 1, oz: 28.3495 };
const VOLUME_FACTORS: Partial<Record<Unit, number>> = {
  ml: 1,
  'fl oz': 29.5735,
  cup: 236.588,
  tbsp: 14.7868,
  tsp: 4.92892,
};

/**
 * What one "serving" of a database food is, worked out from its serving text
 * (for example "100g", "1 cup", or "1 medium (118g)").
 * `amount` is in grams (kind "mass") or milliliters (kind "volume").
 * kind is null when the text has no measurable amount (for example "1 slice").
 */
export type BaseServing = {
  kind: 'mass' | 'volume' | null;
  amount: number;
  startUnit: Unit;
  startAmount: number;
};

const UNIT_REGEX =
  /(\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:\.\d+)?)\s*(fl\.?\s*oz|fluid\s+ounces?|milliliters?|millilitres?|ml|grams?|g|ounces?|oz|cups?|tbsp|tablespoons?|tsp|teaspoons?)\b/gi;

function parseNumber(text: string): number {
  const t = text.trim();
  if (t.includes('/')) {
    const parts = t.split(/\s+/);
    const fraction = parts[parts.length - 1].split('/');
    const whole = parts.length > 1 ? Number(parts[0]) : 0;
    return whole + Number(fraction[0]) / Number(fraction[1]);
  }
  return Number(t);
}

function toUnit(raw: string): Unit {
  const u = raw.toLowerCase().replace(/\s+/g, ' ');
  if (u.startsWith('fl') || u.startsWith('fluid')) return 'fl oz';
  if (u.startsWith('milli') || u === 'ml') return 'ml';
  if (u.startsWith('gram') || u === 'g') return 'g';
  if (u.startsWith('ounce') || u === 'oz') return 'oz';
  if (u.startsWith('cup')) return 'cup';
  if (u.startsWith('tbsp') || u.startsWith('tablespoon')) return 'tbsp';
  return 'tsp';
}

export function parseServing(text?: string): BaseServing {
  const none: BaseServing = { kind: null, amount: 1, startUnit: 'serving', startAmount: 1 };
  if (!text) return none;

  const matches: { n: number; unit: Unit }[] = [];
  for (const m of text.matchAll(UNIT_REGEX)) {
    const n = parseNumber(m[1]);
    if (n > 0 && Number.isFinite(n)) matches.push({ n, unit: toUnit(m[2]) });
  }
  if (matches.length === 0) return none;

  // Prefer a grams or milliliters amount when the text has one, e.g. "1 cup (240 ml)".
  const chosen = matches.find((m) => m.unit === 'g' || m.unit === 'ml') ?? matches[0];
  const massFactor = MASS_FACTORS[chosen.unit];
  if (massFactor) {
    return { kind: 'mass', amount: chosen.n * massFactor, startUnit: chosen.unit, startAmount: chosen.n };
  }
  const volumeFactor = VOLUME_FACTORS[chosen.unit] ?? 1;
  return { kind: 'volume', amount: chosen.n * volumeFactor, startUnit: chosen.unit, startAmount: chosen.n };
}

/** The units the user can choose between for this food. */
export function unitsFor(base: BaseServing): Unit[] {
  if (base.kind === 'mass') return ['serving', 'g', 'oz'];
  if (base.kind === 'volume') return ['serving', 'ml', 'fl oz', 'cup', 'tbsp', 'tsp'];
  return ['serving'];
}

// ---------------------------------------------------------------------------
// Wheel values
// ---------------------------------------------------------------------------
function range(min: number, max: number, step: number): number[] {
  const out: number[] = [];
  const count = Math.round((max - min) / step);
  for (let i = 0; i <= count; i++) out.push(Math.round((min + i * step) * 1000) / 1000);
  return out;
}

const AMOUNT_RANGES: Record<Unit, [number, number, number]> = {
  serving: [0.25, 10, 0.25],
  g: [1, 1000, 1],
  oz: [0.25, 40, 0.25],
  ml: [5, 1000, 5],
  'fl oz': [0.5, 40, 0.5],
  cup: [0.25, 8, 0.25],
  tbsp: [0.5, 32, 0.5],
  tsp: [0.5, 48, 0.5],
};

const amountCache = new Map<Unit, number[]>();

/** The numbers shown on the amount wheel for a unit (the same array every time). */
export function amountOptions(unit: Unit): number[] {
  let list = amountCache.get(unit);
  if (!list) {
    const [min, max, step] = AMOUNT_RANGES[unit];
    list = range(min, max, step);
    amountCache.set(unit, list);
  }
  return list;
}

/** Whole numbers from 0 to max, for the nutrition wheels. */
export function wholeNumbers(max: number): number[] {
  return range(0, max, 1);
}

export function nearest(options: number[], value: number): number {
  let best = options[0];
  for (const o of options) {
    if (Math.abs(o - value) < Math.abs(best - value)) best = o;
  }
  return best;
}

// ---------------------------------------------------------------------------
// Converting between units and working out nutrition
// ---------------------------------------------------------------------------

/** How many database servings a chosen amount is. */
export function toMultiplier(unit: Unit, amount: number, base: BaseServing): number {
  if (unit === 'serving' || base.kind === null || base.amount <= 0) return amount;
  const factor = base.kind === 'mass' ? MASS_FACTORS[unit] : VOLUME_FACTORS[unit];
  if (!factor) return amount;
  return (amount * factor) / base.amount;
}

/** Same physical amount, expressed in another unit. */
export function convertAmount(from: Unit, amount: number, to: Unit, base: BaseServing): number {
  const servings = toMultiplier(from, amount, base);
  if (to === 'serving' || base.kind === null) return servings;
  const factor = base.kind === 'mass' ? MASS_FACTORS[to] : VOLUME_FACTORS[to];
  if (!factor) return servings;
  return (servings * base.amount) / factor;
}

/** Nutrition for the chosen amount, rounded to whole numbers for the wheels. */
export function macrosFor(perServing: Macros, multiplier: number): Macros {
  return {
    calories: Math.round(perServing.calories * multiplier),
    protein: Math.round(perServing.protein * multiplier),
    carbs: Math.round(perServing.carbs * multiplier),
    fat: Math.round(perServing.fat * multiplier),
  };
}

export function fmtAmount(n: number): string {
  return Number(n.toFixed(2)).toString();
}
