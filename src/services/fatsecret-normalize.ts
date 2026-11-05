// Turns whatever the proxy returns into one simple shape the app uses.
// Pure functions (no React), so they are easy to test.

export type FoodResult = {
  id: string;
  name: string;
  brand: string;
  serving: string; // e.g. "100g" or "1 medium"
  calories: number; // all values are for ONE serving
  protein: number;
  carbs: number;
  fat: number;
};

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return typeof v === 'string' ? v : v == null ? '' : String(v);
}

/** Finds the list of foods in the response, whichever key it is under. */
export function extractList(json: unknown): unknown[] {
  if (Array.isArray(json)) return json;
  if (json && typeof json === 'object') {
    const obj = json as Record<string, unknown>;
    for (const key of ['results', 'foods', 'items', 'data']) {
      const value = obj[key];
      if (Array.isArray(value)) return value;
      // FatSecret's own format: { foods: { food: [...] } }
      if (value && typeof value === 'object') {
        const inner = (value as Record<string, unknown>).food;
        if (Array.isArray(inner)) return inner;
        if (inner && typeof inner === 'object') return [inner];
      }
    }
  }
  return [];
}

export function normalizeResults(json: unknown): FoodResult[] {
  const seen = new Set<string>();
  const out: FoodResult[] = [];

  for (const item of extractList(json)) {
    if (!item || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const id = str(o.id ?? o.food_id);
    const name = str(o.name ?? o.food_name);
    if (!id || !name || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      name,
      brand: str(o.brand ?? o.brand_name),
      serving: str(o.serving ?? o.serving_description ?? o.serving_size),
      calories: num(o.calories ?? o.kcal),
      protein: num(o.protein),
      carbs: num(o.carbs ?? o.carbohydrate ?? o.carbohydrates),
      fat: num(o.fat),
    });
  }
  return out;
}

/** Puts foods that start with what the user typed (like "bread" for "br") first. */
export function rankResults(list: FoodResult[], query: string): FoodResult[] {
  const q = query.trim().toLowerCase();
  const starts = list.filter((f) => f.name.toLowerCase().startsWith(q));
  const rest = list.filter((f) => !f.name.toLowerCase().startsWith(q));
  return [...starts, ...rest];
}
