import Database from 'better-sqlite3';
import { Food, FoodWithNutrients, Nutrient } from '../models/Food';

export class FoodService {
  constructor(private db: Database.Database) {}

  searchFoods(query: string, limit: number = 10): Food[] {
    const stmt = this.db.prepare(`
      SELECT * FROM foods
      WHERE LOWER(description) LIKE LOWER(?)
      ORDER BY
        CASE
          WHEN LOWER(description) = LOWER(?) THEN 0
          WHEN LOWER(description) LIKE LOWER(?) THEN 1
          ELSE 2
        END,
        description
      LIMIT ?
    `);

    const searchPattern = `%${query}%`;
    return stmt.all(searchPattern, query, `${query}%`, limit) as Food[];
  }

  getFoodById(id: number): Food | undefined {
    const stmt = this.db.prepare('SELECT * FROM foods WHERE id = ?');
    return stmt.get(id) as Food | undefined;
  }

  getFoodWithNutrients(foodId: number): FoodWithNutrients | undefined {
    const food = this.getFoodById(foodId);
    if (!food) return undefined;

    const stmt = this.db.prepare(`
      SELECT n.*, fn.amount
      FROM nutrients n
      JOIN food_nutrients fn ON n.id = fn.nutrient_id
      WHERE fn.food_id = ?
    `);

    const nutrients = stmt.all(foodId) as Array<Nutrient & { amount: number }>;

    return {
      ...food,
      nutrients: nutrients.map(n => ({
        nutrient: {
          id: n.id,
          nutrient_id: n.nutrient_id,
          name: n.name,
          unit_name: n.unit_name,
          nutrient_number: n.nutrient_number
        },
        amount: n.amount
      }))
    };
  }

  getAllNutrients(): Nutrient[] {
    const stmt = this.db.prepare('SELECT * FROM nutrients ORDER BY name');
    return stmt.all() as Nutrient[];
  }

  getNutrientById(id: number): Nutrient | undefined {
    const stmt = this.db.prepare('SELECT * FROM nutrients WHERE id = ?');
    return stmt.get(id) as Nutrient | undefined;
  }

  getNutrientByName(name: string): Nutrient | undefined {
    const stmt = this.db.prepare('SELECT * FROM nutrients WHERE LOWER(name) = LOWER(?)');
    return stmt.get(name) as Nutrient | undefined;
  }

  // For learning system
  recordUserSelection(query: string, foodId: number, foodType: 'usda' | 'custom'): void {
    const existing = this.db.prepare(`
      SELECT * FROM user_selections
      WHERE LOWER(query) = LOWER(?) AND selected_food_id = ? AND selected_food_type = ?
    `).get(query, foodId, foodType) as any;

    if (existing) {
      this.db.prepare(`
        UPDATE user_selections
        SET selection_count = selection_count + 1,
            last_selected_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).run(existing.id);
    } else {
      this.db.prepare(`
        INSERT INTO user_selections (query, selected_food_id, selected_food_type)
        VALUES (?, ?, ?)
      `).run(query, foodId, foodType);
    }
  }

  getLearnedSelection(query: string): { food_id: number; food_type: string; count: number } | undefined {
    const stmt = this.db.prepare(`
      SELECT selected_food_id as food_id, selected_food_type as food_type, selection_count as count
      FROM user_selections
      WHERE LOWER(query) = LOWER(?)
      ORDER BY selection_count DESC, last_selected_at DESC
      LIMIT 1
    `);
    return stmt.get(query) as any;
  }
}
