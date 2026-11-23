import type { PantryItemRow } from './pantry';

export type PantrySort = 'newest' | 'expiration';
type Sortable = Pick<PantryItemRow,
  'pantry_item_id' | 'date_added' | 'expiration_date'>;

function addedAt(item: Sortable): number {
  const time = item.date_added ? Date.parse(item.date_added) : NaN;
  return Number.isFinite(time) ? time : -Infinity;
}

function newestFirst(a: Sortable, b: Sortable): number {
  const first = addedAt(a);
  const second = addedAt(b);
  if (first !== second) return first > second ? -1 : 1;
  return b.pantry_item_id - a.pantry_item_id;
}

function expirationKey(item: Sortable): string | null {
  const value = item.expiration_date;
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    ? value : null;
}

// Sort a copy so switching tabs or searching never mutates loaded inventory.
export function sortPantryItems<T extends Sortable>(
  items: readonly T[],
  order: PantrySort
): T[] {
  return [...items].sort((a, b) => {
    if (order === 'newest') return newestFirst(a, b);
    const first = expirationKey(a);
    const second = expirationKey(b);
    if (first === null && second !== null) return 1;
    if (first !== null && second === null) return -1;
    // ISO calendar-date strings sort without any local-time conversion.
    if (first !== null && second !== null && first !== second) {
      return first < second ? -1 : 1;
    }
    return newestFirst(a, b);
  });
}
