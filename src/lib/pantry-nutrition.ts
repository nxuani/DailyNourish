import type { FoodSearchItem } from './fatsecret';

export type PantryUnitOption = {
  value: string;
  label: string;
  servingsPerUnit: number;
};

export type PantryNutrition = {
  calories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
};

function positive(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0;
}

// Branded foods may say measurementDescription="serving" while their
// serving description contains the actual measure, for example "1/2 cup".
// Only accept an explicit household amount, not a guessed food density.
function householdFromDescription(text: string | null): {
  count: number;
  unit: string;
} | null {
  if (!text) return null;
  const fractions: Record<string, string> = {
    '½': '1/2', '¼': '1/4', '¾': '3/4', '⅓': '1/3', '⅔': '2/3',
    '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
  };
  let normalized = text.toLowerCase().replace(/[½¼¾⅓⅔⅛⅜⅝⅞]/g,
    (character) => ` ${fractions[character]}`).replace(/\s+/g, ' ').trim();
  const wrapped = normalized.match(/^1\s+servings?\s*\(([^()]*)\)$/);
  if (wrapped) normalized = wrapped[1].trim();

  const match = normalized.match(
    /^(\d+\s+\d+\s*\/\s*\d+|\d+\s*\/\s*\d+|\d+(?:\.\d+)?|\.\d+)\s*(cups?|tablespoons?|tbsp|teaspoons?|tsp|fl\.?\s*oz|fluid\s+ounces?)\.?(?:\s*\([^()]*\))?$/
  );
  if (!match) return null;
  const amount = match[1].replace(/\s*\/\s*/g, '/');
  let count: number;
  if (amount.includes('/')) {
    const parts = amount.split(/\s+/);
    const fraction = parts.pop()!.split('/').map(Number);
    count = Number(parts[0] ?? 0) + fraction[0] / fraction[1];
  } else {
    count = Number(amount);
  }
  if (!positive(count)) return null;
  const unit = match[2].replace(/\./g, '').replace(/\s+/g, ' ');
  return { count, unit };
}

// Only build conversions from measurements belonging to this food's serving.
export function pantryUnitOptions(
  food: FoodSearchItem | null
): PantryUnitOption[] {
  if (!food) return [];

  const options: PantryUnitOption[] = [
    { value: 'servings', label: 'Servings', servingsPerUnit: 1 },
  ];

  function add(value: string, label: string, servingsPerUnit: number) {
    if (!positive(servingsPerUnit)) return;
    if (options.some((option) => option.value === value)) return;
    options.push({ value, label, servingsPerUnit });
  }

  const metric = food.metricServingAmount;
  const metricUnit = food.metricServingUnit;

  if (positive(metric)) {
    const grams = metricUnit === 'g'
      ? metric
      : metricUnit === 'oz' ? metric * 28.349523125 : null;

    if (positive(grams)) {
      add('g', 'Grams (g)', 1 / grams);
      add('kg', 'Kilograms (kg)', 1000 / grams);
      add('oz', 'Ounces (oz)', 28.349523125 / grams);
      add('lb', 'Pounds (lb)', 453.59237 / grams);
    }

    if (metricUnit === 'ml') {
      add('ml', 'Milliliters (ml)', 1 / metric);
      add('L', 'Liters (L)', 1000 / metric);
      add('fl oz', 'US fluid ounces', 29.5735295625 / metric);
      add('cups', 'US cups', 236.5882365 / metric);
      add('tablespoons', 'US tablespoons', 14.78676478125 / metric);
      add('teaspoons', 'US teaspoons', 4.92892159375 / metric);
    }
  }

  let count = food.numberOfUnits;
  let description = food.measurementDescription?.trim();
  let unit = description?.toLowerCase().replace(/\.$/, '');

  // A direct household measure can establish a food-specific conversion,
  // even when its metric measurement is a weight rather than a volume.
  const household: Record<string, number> = {
    cup: 48, cups: 48,
    tablespoon: 3, tablespoons: 3, tbsp: 3,
    teaspoon: 1, teaspoons: 1, tsp: 1,
    'fl oz': 6, 'fluid ounce': 6, 'fluid ounces': 6,
  };

  // Fall back to the full description when the structured field is generic.
  if (!unit || !positive(household[unit]) || !positive(count)) {
    const described = householdFromDescription(food.serving);
    if (described) {
      count = described.count;
      unit = described.unit;
      description = described.unit;
    }
  }

  if (positive(count) && unit) {
    const teaspoons = household[unit];
    if (positive(teaspoons)) {
      const perServing = count * teaspoons;
      // Prefer the food's explicitly supplied household measure.
      for (const value of ['cups', 'tablespoons', 'teaspoons', 'fl oz']) {
        const index = options.findIndex((option) => option.value === value);
        if (index !== -1) options.splice(index, 1);
      }
      add('cups', 'US cups', 48 / perServing);
      add('tablespoons', 'US tablespoons', 3 / perServing);
      add('teaspoons', 'US teaspoons', 1 / perServing);
      add('fl oz', 'US fluid ounces', 6 / perServing);
    } else if (![
      'serving', 'servings', 'g', 'gram', 'grams', 'kg',
      'ml', 'milliliter', 'milliliters', 'l', 'liter', 'liters',
      'oz', 'ounce', 'ounces', 'lb', 'pound', 'pounds',
    ].includes(unit)) {
      // For example: "large", "slice", or "piece".
      // "portion" is interpreted using the saved serving ID.
      add('portion', `${description} ${food.name}`.trim(), 1 / count);
    }
  }

  // Show the food's household/portion choices before weight conversions.
  const order = ['servings', 'cups', 'tablespoons', 'teaspoons', 'portion',
    'g', 'kg', 'oz', 'lb', 'ml', 'L', 'fl oz'];
  return options.sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
}

export function pantryServingMultiplier(
  food: FoodSearchItem | null,
  quantity: number,
  unit: string
): number | null {
  if (!positive(quantity)) return null;
  const option = pantryUnitOptions(food).find((item) => item.value === unit);
  if (!option) return null;
  const multiplier = quantity * option.servingsPerUnit;
  return positive(multiplier) ? multiplier : null;
}

// Missing nutrition stays unknown; a real zero stays zero.
// Keep precision here and round only when displaying the result.
export function pantryNutrition(
  food: FoodSearchItem | null,
  quantity: number,
  unit: string
): PantryNutrition | null {
  const multiplier = pantryServingMultiplier(food, quantity, unit);
  if (!food || multiplier === null) return null;

  function scale(value: number | null): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
      return null;
    }
    const result = value * multiplier!;
    return Number.isFinite(result) ? result : null;
  }

  return {
    calories: scale(food.calories),
    protein: scale(food.protein),
    carbs: scale(food.carbs),
    fat: scale(food.fat),
  };
}

export function convertPantryQuantity(
  food: FoodSearchItem | null,
  quantity: number,
  fromUnit: string,
  toUnit: string
): number | null {
  const multiplier = pantryServingMultiplier(food, quantity, fromUnit);
  const target = pantryUnitOptions(food).find((item) => item.value === toUnit);
  if (multiplier === null || !target) return null;
  const result = multiplier / target.servingsPerUnit;
  return positive(result) ? result : null;
}
