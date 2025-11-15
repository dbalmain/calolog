export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';
export type Gender = 'male' | 'female';

export interface Goal {
  id: number;
  nutrient_id: number;
  daily_target: number;
}

export interface UserProfile {
  id: number;
  age: number | null;
  gender: Gender | null;
  weight_kg: number | null;
  height_cm: number | null;
  activity_level: ActivityLevel | null;
  updated_at: string;
}

export interface CreateGoalInput {
  nutrient_id: number;
  daily_target: number;
}

export interface UpdateProfileInput {
  age?: number;
  gender?: Gender;
  weight_kg?: number;
  height_cm?: number;
  activity_level?: ActivityLevel;
}
