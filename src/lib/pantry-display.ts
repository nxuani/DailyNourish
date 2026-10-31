import { getFoodById } from './fatsecret';
import { loadPantryItems, type PantryItemRow } from './pantry';
import { supabase } from './supabase';

export type PantryDisplayItem = PantryItemRow & {
  name: string;
  detailsUnavailable: boolean;
};

// Fetch inventory first, then resolve names from the appropriate source.
// A failed food lookup keeps the inventory entry visible.
export async function loadPantryDisplay(): Promise<PantryDisplayItem[]> {
  const rows = await loadPantryItems();

  // Deduplicate lookups within this load only.
  // Nothing is persisted or cached between loads.
  const names = new Map<string, Promise<string>>();

  function findName(row: PantryItemRow): Promise<string> {
    const key = row.fatsecret_food_id !== null
      ? `fatsecret:${row.fatsecret_food_id}`
      : `ingredient:${row.ingredient_id}`;

    const existing = names.get(key);
    if (existing) return existing;

    const request = (async () => {
      if (row.fatsecret_food_id !== null) {
        const food = await getFoodById(row.fatsecret_food_id);
        return food.name;
      }

      if (row.ingredient_id === null) {
        throw new Error('Missing food reference.');
      }

      // Preserve support for existing local ingredient records.
      const { data, error } = await supabase
        .from('ingredients')
        .select('name')
        .eq('ingredient_id', row.ingredient_id)
        .single();

      if (error) throw error;

      if (!data || typeof data.name !== 'string') {
        throw new Error('Ingredient name unavailable.');
      }

      return data.name;
    })();

    names.set(key, request);
    return request;
  }

  const result: PantryDisplayItem[] = [];

  // Limit simultaneous lookups to four.
  for (let offset = 0; offset < rows.length; offset += 4) {
    const batch = await Promise.all(
      rows.slice(offset, offset + 4).map(async (row) => {
        try {
          return {
            ...row,
            name: await findName(row),
            detailsUnavailable: false,
          };
        } catch {
          return {
            ...row,
            name: 'Food details unavailable',
            detailsUnavailable: true,
          };
        }
      })
    );

    result.push(...batch);
  }

  return result;
}

// Compare calendar dates rather than elapsed hours.
// This avoids shifting an expiration date because of time zones or DST.
export function expirationStatus(value: string | null): {
  label: string;
  warning: boolean;
} {
  if (!value) {
    return { label: 'No expiration set', warning: false };
  }

  const expiry = Date.parse(`${value}T00:00:00.000Z`);

  if (!Number.isFinite(expiry)) {
    return { label: 'Expiration unavailable', warning: false };
  }

  const now = new Date();
  const today = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const days = Math.round((expiry - today) / 86400000);

  if (days < 0) {
    const count = Math.abs(days);
    return {
      label: `Expired ${count} day${count === 1 ? '' : 's'} ago`,
      warning: true,
    };
  }

  if (days === 0) return { label: 'Expires today', warning: true };
  if (days === 1) return { label: 'Expires tomorrow', warning: true };

  return {
    label: `Expires in ${days} days`,
    warning: days <= 3,
  };
}