export interface Food {
  id: number;
  fdc_id: number | null;
  description: string;
  data_type: string | null;
  brand_owner: string | null;
  search_vector: string | null;
  created_at: string;
}

export interface Nutrient {
  id: number;
  nutrient_id: number;
  name: string;
  unit_name: string;
  nutrient_number: string | null;
}

export interface FoodNutrient {
  food_id: number;
  nutrient_id: number;
  amount: number; // Per 100g
}

export interface FoodWithNutrients extends Food {
  nutrients: Array<{
    nutrient: Nutrient;
    amount: number;
  }>;
}
