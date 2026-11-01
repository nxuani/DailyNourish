export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal {
  meal_type: MealType;
  name: string;
  ingredients: string[];
  est_calories: number;
  est_protein_g: number;
  est_sodium_mg: number;
}

export interface DayPlan {
  day: number; // 1 = Monday
  meals: Meal[];
}

export interface MealPlan {
  days: DayPlan[];
  notes?: string;
}