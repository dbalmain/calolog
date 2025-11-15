export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type FoodType = 'usda' | 'custom' | 'recipe';

export interface Entry {
  id: number;
  date: string; // ISO date string
  time: string | null; // ISO time string
  meal_type: MealType | null;
  food_id: number;
  food_type: FoodType;
  amount_grams: number | null;
  servings: number | null;
  notes: string | null;
  created_at: string;
}

export interface CreateEntryInput {
  date?: string; // Defaults to today
  time?: string;
  meal_type?: MealType;
  food_id: number;
  food_type: FoodType;
  amount_grams?: number;
  servings?: number;
  notes?: string;
}
