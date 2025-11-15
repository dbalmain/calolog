import { FoodType } from './Entry';

export interface Recipe {
  id: number;
  name: string;
  servings: number;
  instructions: string | null;
  created_at: string;
}

export interface RecipeIngredient {
  id: number;
  recipe_id: number;
  food_id: number;
  food_type: FoodType;
  amount_grams: number;
}

export interface RecipeWithIngredients extends Recipe {
  ingredients: RecipeIngredient[];
}

export interface CreateRecipeInput {
  name: string;
  servings: number;
  instructions?: string;
  ingredients: Array<{
    food_id: number;
    food_type: FoodType;
    amount_grams: number;
  }>;
}
