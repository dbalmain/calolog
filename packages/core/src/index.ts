// Database
export { DatabaseManager } from './db/database';

// Models
export * from './models/Food';
export * from './models/Entry';
export * from './models/Recipe';
export * from './models/Goal';

// Services
export { FoodService } from './services/FoodService';
export { EntryService } from './services/EntryService';
export { RecipeService } from './services/RecipeService';
export { GoalService } from './services/GoalService';
export { NutritionCalculator, NutrientTotal, NutritionSummary } from './services/NutritionCalculator';

// Fuzzy matching
export { FuzzyMatcher, FuzzyMatch } from './fuzzy/FuzzyMatcher';
