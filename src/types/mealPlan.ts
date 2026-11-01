export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Ingredient {
  name: string;
  amount: string;
}

export interface Meal {
  meal_type: MealType;
  name: string;
  calories: number;
  protein_g: number;
  ingredients: Ingredient[];
  instructions: string[];
}

export interface DayPlan {
  day: string;
  meals: Meal[];
}

export interface MealPlan {
  days: DayPlan[];
}