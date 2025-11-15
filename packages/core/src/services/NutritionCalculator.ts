import Database from 'better-sqlite3';
import { Entry } from '../models/Entry';
import { Nutrient } from '../models/Food';

export interface NutrientTotal {
  nutrient: Nutrient;
  amount: number;
  goal: number | null;
  percentOfGoal: number | null;
}

export interface NutritionSummary {
  date: string;
  nutrients: NutrientTotal[];
  totalCalories: number;
}

export class NutritionCalculator {
  constructor(private db: Database.Database) {}

  calculateEntryNutrients(entry: Entry): Map<number, number> {
    const nutrients = new Map<number, number>();

    if (entry.food_type === 'recipe') {
      return this.calculateRecipeNutrients(entry.food_id, entry.servings || 1);
    } else {
      // For regular foods (usda or custom)
      const table = entry.food_type === 'usda' ? 'foods' : 'custom_foods';
      const nutrientTable = entry.food_type === 'usda' ? 'food_nutrients' : 'custom_food_nutrients';

      const stmt = this.db.prepare(`
        SELECT fn.nutrient_id, fn.amount
        FROM ${nutrientTable} fn
        WHERE fn.food_id = ?
      `);

      const foodNutrients = stmt.all(entry.food_id) as Array<{ nutrient_id: number; amount: number }>;
      const amountGrams = entry.amount_grams || 0;

      for (const fn of foodNutrients) {
        // amount is per 100g, so calculate for actual amount
        nutrients.set(fn.nutrient_id, (fn.amount * amountGrams) / 100);
      }
    }

    return nutrients;
  }

  calculateRecipeNutrients(recipeId: number, servings: number = 1): Map<number, number> {
    const nutrients = new Map<number, number>();

    // Get recipe
    const recipe = this.db.prepare('SELECT * FROM recipes WHERE id = ?').get(recipeId) as any;
    if (!recipe) return nutrients;

    // Get ingredients
    const ingredients = this.db.prepare(`
      SELECT * FROM recipe_ingredients WHERE recipe_id = ?
    `).all(recipeId) as Array<{ food_id: number; food_type: string; amount_grams: number }>;

    for (const ingredient of ingredients) {
      const table = ingredient.food_type === 'usda' ? 'foods' : 'custom_foods';
      const nutrientTable = ingredient.food_type === 'usda' ? 'food_nutrients' : 'custom_food_nutrients';

      const stmt = this.db.prepare(`
        SELECT fn.nutrient_id, fn.amount
        FROM ${nutrientTable} fn
        WHERE fn.food_id = ?
      `);

      const foodNutrients = stmt.all(ingredient.food_id) as Array<{ nutrient_id: number; amount: number }>;

      for (const fn of foodNutrients) {
        const amount = (fn.amount * ingredient.amount_grams) / 100;
        nutrients.set(fn.nutrient_id, (nutrients.get(fn.nutrient_id) || 0) + amount);
      }
    }

    // Divide by recipe servings and multiply by requested servings
    const perServingMultiplier = servings / recipe.servings;
    for (const [nutrientId, amount] of nutrients.entries()) {
      nutrients.set(nutrientId, amount * perServingMultiplier);
    }

    return nutrients;
  }

  calculateDailySummary(date: string): NutritionSummary {
    // Get all entries for the date
    const entries = this.db.prepare(`
      SELECT * FROM entries WHERE date = ?
    `).all(date) as Entry[];

    // Calculate total nutrients
    const totalNutrients = new Map<number, number>();

    for (const entry of entries) {
      const entryNutrients = this.calculateEntryNutrients(entry);
      for (const [nutrientId, amount] of entryNutrients.entries()) {
        totalNutrients.set(nutrientId, (totalNutrients.get(nutrientId) || 0) + amount);
      }
    }

    // Get all nutrients
    const allNutrients = this.db.prepare('SELECT * FROM nutrients').all() as Nutrient[];

    // Get goals
    const goals = this.db.prepare('SELECT * FROM goals').all() as Array<{ nutrient_id: number; daily_target: number }>;
    const goalMap = new Map(goals.map(g => [g.nutrient_id, g.daily_target]));

    // Build summary
    const nutrients: NutrientTotal[] = allNutrients.map(nutrient => {
      const amount = totalNutrients.get(nutrient.id) || 0;
      const goal = goalMap.get(nutrient.id) || null;
      const percentOfGoal = goal ? (amount / goal) * 100 : null;

      return {
        nutrient,
        amount,
        goal,
        percentOfGoal
      };
    });

    // Calculate total calories (Energy nutrient)
    const energyNutrient = allNutrients.find(n => n.name.toLowerCase().includes('energy'));
    const totalCalories = energyNutrient ? (totalNutrients.get(energyNutrient.id) || 0) : 0;

    return {
      date,
      nutrients,
      totalCalories
    };
  }

  calculatePeriodSummary(startDate: string, endDate: string): NutritionSummary[] {
    const summaries: NutritionSummary[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
      const dateStr = date.toISOString().split('T')[0];
      summaries.push(this.calculateDailySummary(dateStr));
    }

    return summaries;
  }

  getDeficientNutrients(date: string, threshold: number = 80): Array<{ nutrient: Nutrient; percent: number; goal: number }> {
    const summary = this.calculateDailySummary(date);

    return summary.nutrients
      .filter(n => n.goal !== null && n.percentOfGoal !== null && n.percentOfGoal < threshold)
      .map(n => ({
        nutrient: n.nutrient,
        percent: n.percentOfGoal!,
        goal: n.goal!
      }))
      .sort((a, b) => a.percent - b.percent);
  }
}
