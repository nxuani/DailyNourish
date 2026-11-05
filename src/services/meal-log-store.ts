import { useSyncExternalStore } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export const MEAL_TYPES: { key: MealType; label: string }[] = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack', label: 'Snacks' },
];

export type Macros = {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
};

// Nutrition values are stored PER 1 SERVING. `servings` scales them.
export type Food = Macros & {
  id: string;
  name: string;
  amount: string; // e.g. "1 cup"
  servings: number;
};

export type MealEntry = { foods: Food[]; notes: string };
export type DayLog = Record<MealType, MealEntry>;
type LogState = Record<string, DayLog>; // key = date like "2026-09-14"

// Placeholder daily targets. Replace with the user's real targets from their profile later.
export const DAILY_TARGETS: Macros = { calories: 2000, protein: 120, carbs: 250, fat: 65 };

// ---------------------------------------------------------------------------
// Date helpers (all dates are the user's local calendar date)
// ---------------------------------------------------------------------------
const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function toDateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

export function fromDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromDateKey(key);
  d.setDate(d.getDate() + n);
  return toDateKey(d);
}

export function formatDateLong(key: string): string {
  const d = fromDateKey(key);
  return `${DAY_NAMES[d.getDay()]}, ${MONTH_NAMES[d.getMonth()]} ${d.getDate()}`;
}

// ---------------------------------------------------------------------------
// Math / formatting helpers
// ---------------------------------------------------------------------------
export function fmt(n: number): string {
  return Math.round(n).toLocaleString('en-US');
}

export function servingsLabel(n: number): string {
  return `${n} ${n === 1 ? 'serving' : 'servings'}`;
}

/** Nutrition for a food after applying its serving count. */
export function scaled(food: Food): Macros {
  return {
    calories: food.calories * food.servings,
    protein: food.protein * food.servings,
    carbs: food.carbs * food.servings,
    fat: food.fat * food.servings,
  };
}

export function sumFoods(foods: Food[]): Macros {
  return foods.reduce<Macros>(
    (total, food) => {
      const s = scaled(food);
      return {
        calories: total.calories + s.calories,
        protein: total.protein + s.protein,
        carbs: total.carbs + s.carbs,
        fat: total.fat + s.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  );
}

export function sumDay(day: DayLog): Macros {
  return sumFoods(MEAL_TYPES.flatMap(({ key }) => day[key].foods));
}

export function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------------------------------------------------------------------------
// The store (kept in memory for now)
// ---------------------------------------------------------------------------
function emptyDay(): DayLog {
  return {
    breakfast: { foods: [], notes: '' },
    lunch: { foods: [], notes: '' },
    dinner: { foods: [], notes: '' },
    snack: { foods: [], notes: '' },
  };
}

// Start with an empty meal log for new users.
let state: LogState = {};

const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): LogState {
  return state;
}

/** Use inside a component. Re-renders the component whenever the log changes. */
export function useMealLog(): LogState {
  return useSyncExternalStore(subscribe, getSnapshot);
}

/** Get one day's log (an empty day if nothing has been logged yet). */
export function getDayLog(log: LogState, dateKey: string): DayLog {
  return log[dateKey] ?? emptyDay();
}

/**
 * Save the foods and notes for one meal on one day.
 * TODO (teammates): also write this to the food_logs table in Supabase.
 */
export function saveMeal(dateKey: string, mealType: MealType, foods: Food[], notes: string) {
  const day = getDayLog(state, dateKey);
  state = { ...state, [dateKey]: { ...day, [mealType]: { foods, notes } } };
  emit();
}

/**
 * Add one food to a meal. The Food Search screen can call this when the user
 * taps "Add to Meal Log".
 */
export function addFoodToMeal(dateKey: string, mealType: MealType, food: Food) {
  const day = getDayLog(state, dateKey);
  const meal = day[mealType];
  saveMeal(dateKey, mealType, [...meal.foods, food], meal.notes);
}
