import Database from 'better-sqlite3';
import { Goal, UserProfile, CreateGoalInput, UpdateProfileInput, Gender, ActivityLevel } from '../models/Goal';

export class GoalService {
  constructor(private db: Database.Database) {}

  // Goal Management
  createGoal(input: CreateGoalInput): Goal {
    const stmt = this.db.prepare(`
      INSERT INTO goals (nutrient_id, daily_target)
      VALUES (?, ?)
    `);

    const result = stmt.run(input.nutrient_id, input.daily_target);
    return this.getGoalById(result.lastInsertRowid as number)!;
  }

  getGoalById(id: number): Goal | undefined {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE id = ?');
    return stmt.get(id) as Goal | undefined;
  }

  getAllGoals(): Goal[] {
    const stmt = this.db.prepare('SELECT * FROM goals');
    return stmt.all() as Goal[];
  }

  getGoalByNutrientId(nutrientId: number): Goal | undefined {
    const stmt = this.db.prepare('SELECT * FROM goals WHERE nutrient_id = ?');
    return stmt.get(nutrientId) as Goal | undefined;
  }

  updateGoal(id: number, dailyTarget: number): Goal | undefined {
    const stmt = this.db.prepare('UPDATE goals SET daily_target = ? WHERE id = ?');
    stmt.run(dailyTarget, id);
    return this.getGoalById(id);
  }

  deleteGoal(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM goals WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  // User Profile Management
  getProfile(): UserProfile | undefined {
    const stmt = this.db.prepare('SELECT * FROM user_profile WHERE id = 1');
    return stmt.get() as UserProfile | undefined;
  }

  createOrUpdateProfile(input: UpdateProfileInput): UserProfile {
    const existing = this.getProfile();

    if (existing) {
      const fields: string[] = [];
      const values: any[] = [];

      if (input.age !== undefined) {
        fields.push('age = ?');
        values.push(input.age);
      }
      if (input.gender !== undefined) {
        fields.push('gender = ?');
        values.push(input.gender);
      }
      if (input.weight_kg !== undefined) {
        fields.push('weight_kg = ?');
        values.push(input.weight_kg);
      }
      if (input.height_cm !== undefined) {
        fields.push('height_cm = ?');
        values.push(input.height_cm);
      }
      if (input.activity_level !== undefined) {
        fields.push('activity_level = ?');
        values.push(input.activity_level);
      }

      if (fields.length > 0) {
        fields.push('updated_at = CURRENT_TIMESTAMP');
        const stmt = this.db.prepare(`
          UPDATE user_profile
          SET ${fields.join(', ')}
          WHERE id = 1
        `);
        stmt.run(...values);
      }
    } else {
      const stmt = this.db.prepare(`
        INSERT INTO user_profile (id, age, gender, weight_kg, height_cm, activity_level)
        VALUES (1, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        input.age || null,
        input.gender || null,
        input.weight_kg || null,
        input.height_cm || null,
        input.activity_level || null
      );
    }

    return this.getProfile()!;
  }

  // RDA Calculation (simplified - based on common nutritional guidelines)
  calculateRDA(nutrientName: string): number | null {
    const profile = this.getProfile();
    if (!profile || !profile.age || !profile.gender) {
      return null;
    }

    const rdaValues: Record<string, { male: number; female: number }> = {
      'Protein': { male: 56, female: 46 }, // grams
      'Carbohydrate': { male: 130, female: 130 }, // grams
      'Total lipid (fat)': { male: 70, female: 70 }, // grams (approximate)
      'Fiber, total dietary': { male: 38, female: 25 }, // grams
      'Calcium, Ca': { male: 1000, female: 1000 }, // mg
      'Iron, Fe': { male: 8, female: 18 }, // mg
      'Magnesium, Mg': { male: 400, female: 310 }, // mg
      'Phosphorus, P': { male: 700, female: 700 }, // mg
      'Potassium, K': { male: 3400, female: 2600 }, // mg
      'Sodium, Na': { male: 2300, female: 2300 }, // mg (upper limit)
      'Zinc, Zn': { male: 11, female: 8 }, // mg
      'Vitamin C, total ascorbic acid': { male: 90, female: 75 }, // mg
      'Thiamin': { male: 1.2, female: 1.1 }, // mg
      'Riboflavin': { male: 1.3, female: 1.1 }, // mg
      'Niacin': { male: 16, female: 14 }, // mg
      'Vitamin B-6': { male: 1.3, female: 1.3 }, // mg
      'Folate, total': { male: 400, female: 400 }, // mcg
      'Vitamin B-12': { male: 2.4, female: 2.4 }, // mcg
      'Vitamin A, RAE': { male: 900, female: 700 }, // mcg
      'Vitamin E (alpha-tocopherol)': { male: 15, female: 15 }, // mg
      'Vitamin D (D2 + D3)': { male: 15, female: 15 }, // mcg
      'Vitamin K (phylloquinone)': { male: 120, female: 90 }, // mcg
    };

    const nutrientRDA = rdaValues[nutrientName];
    if (!nutrientRDA) {
      return null;
    }

    return profile.gender === 'male' ? nutrientRDA.male : nutrientRDA.female;
  }

  // Set default goals based on RDA
  setDefaultGoals(): void {
    const profile = this.getProfile();
    if (!profile || !profile.age || !profile.gender) {
      throw new Error('User profile must be set before creating default goals');
    }

    // Get all nutrients
    const nutrients = this.db.prepare('SELECT * FROM nutrients').all() as Array<{ id: number; name: string }>;

    for (const nutrient of nutrients) {
      const rda = this.calculateRDA(nutrient.name);
      if (rda !== null) {
        // Check if goal already exists
        const existing = this.getGoalByNutrientId(nutrient.id);
        if (!existing) {
          this.createGoal({
            nutrient_id: nutrient.id,
            daily_target: rda
          });
        }
      }
    }
  }
}
