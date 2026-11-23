import { MealType } from './mealPlan';

// Full detail for one recipe/meal, as shown on the Food Details screen.
// Richer than `Meal` (src/types/mealPlan.ts): it carries per-ingredient
// amounts, numbered steps, prep/cook times, and full macros. No source feeds
// this shape yet — the Plan's AI meals and the FatSecret proxy both stop short
// of it — so the screen runs on a mock for now (see MOCK_RECIPE in the screen).

export interface RecipeIngredient {
    name: string;
    qty: number; // amount for ONE serving; the serving stepper scales it
    unit: string; // e.g. 'oz', 'cup', 'tbsp'
}

export interface RecipeStep {
    title: string;
    body: string;
}

// All values are PER ONE serving.
export interface RecipeNutrition {
    calories: number;
    protein: number; // g
    carbs: number; // g
    fat: number; // g
    saturatedFat: number; // g
    fiber: number; // g
    sugars: number; // g
    sodium: number; // mg
}

export interface RecipeDetail {
    id: string;
    name: string;
    mealType: MealType;
    tags: string[]; // e.g. ['Low sodium', 'Pantry-friendly']
    image: string | null; // photo URL, or null to use the emoji fallback
    emoji: string; // fallback icon when there's no photo
    servingLabel: string; // singular noun for one serving, e.g. 'bowl'
    prepMinutes: number;
    cookMinutes: number;
    ingredients: RecipeIngredient[];
    note: string | null; // small print under the ingredient list
    steps: RecipeStep[];
    nutrition: RecipeNutrition;
}
