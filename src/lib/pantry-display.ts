import { getFoodById } from './fatsecret';
import { loadPantryItems, type PantryItemRow } from './pantry';
import { supabase } from './supabase';

export type PantryDisplayItem = PantryItemRow & {
  name: string;
  image: string | null;
  detailsUnavailable: boolean;
};

type FoodDisplayDetails = {
  name: string;
  image: string | null;
};

// Load saved inventory and retrieve its current names and images.
// Image URLs are held only for display, not written to Supabase.
export async function loadPantryDisplay(): Promise<PantryDisplayItem[]> {
  const rows = await loadPantryItems();

  // Deduplicate requests within this load only.
  const details = new Map<string, Promise<FoodDisplayDetails>>();

  function findDetails(row: PantryItemRow): Promise<FoodDisplayDetails> {
    const key = row.fatsecret_food_id !== null
      ? `fatsecret:${row.fatsecret_food_id}`
      : `ingredient:${row.ingredient_id}`;

    const existing = details.get(key);
    if (existing) return existing;

    const request = (async (): Promise<FoodDisplayDetails> => {
      if (row.fatsecret_food_id !== null) {
        const food = await getFoodById(row.fatsecret_food_id);

        return {
          name: food.name,
          image: food.image ?? null,
        };
      }

      if (row.ingredient_id === null) {
        throw new Error('Missing food reference.');
      }

      // Existing local ingredients have no image column.
      // The image component will use their related emoji.
      const { data, error } = await supabase
        .from('ingredients')
        .select('name')
        .eq('ingredient_id', row.ingredient_id)
        .single();

      if (error) throw error;

      if (!data || typeof data.name !== 'string') {
        throw new Error('Ingredient name unavailable.');
      }

      return {
        name: data.name,
        image: null,
      };
    })();

    details.set(key, request);
    return request;
  }

  const result: PantryDisplayItem[] = [];

  // Limit simultaneous food lookups to four.
  for (let offset = 0; offset < rows.length; offset += 4) {
    const batch = await Promise.all(
      rows.slice(offset, offset + 4).map(async (row) => {
        try {
          const food = await findDetails(row);

          return {
            ...row,
            ...food,
            detailsUnavailable: false,
          };
        } catch {
          // Keep saved quantities and dates visible when lookup fails.
          return {
            ...row,
            name: 'Food details unavailable',
            image: null,
            detailsUnavailable: true,
          };
        }
      })
    );

    result.push(...batch);
  }

  return result;
}

// Compare calendar dates, avoiding time-zone and DST shifts.
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