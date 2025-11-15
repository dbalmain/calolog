import Database from 'better-sqlite3';
import { Recipe, RecipeWithIngredients, RecipeIngredient, CreateRecipeInput } from '../models/Recipe';

export class RecipeService {
  constructor(private db: Database.Database) {}

  createRecipe(input: CreateRecipeInput): RecipeWithIngredients {
    const insertRecipe = this.db.prepare(`
      INSERT INTO recipes (name, servings, instructions)
      VALUES (?, ?, ?)
    `);

    const result = insertRecipe.run(
      input.name,
      input.servings,
      input.instructions || null
    );

    const recipeId = result.lastInsertRowid as number;

    // Insert ingredients
    const insertIngredient = this.db.prepare(`
      INSERT INTO recipe_ingredients (recipe_id, food_id, food_type, amount_grams)
      VALUES (?, ?, ?, ?)
    `);

    for (const ingredient of input.ingredients) {
      insertIngredient.run(
        recipeId,
        ingredient.food_id,
        ingredient.food_type,
        ingredient.amount_grams
      );
    }

    return this.getRecipeById(recipeId)!;
  }

  getRecipeById(id: number): RecipeWithIngredients | undefined {
    const recipeStmt = this.db.prepare('SELECT * FROM recipes WHERE id = ?');
    const recipe = recipeStmt.get(id) as Recipe | undefined;

    if (!recipe) return undefined;

    const ingredientsStmt = this.db.prepare(`
      SELECT * FROM recipe_ingredients WHERE recipe_id = ?
    `);
    const ingredients = ingredientsStmt.all(id) as RecipeIngredient[];

    return {
      ...recipe,
      ingredients
    };
  }

  getAllRecipes(): Recipe[] {
    const stmt = this.db.prepare('SELECT * FROM recipes ORDER BY name');
    return stmt.all() as Recipe[];
  }

  searchRecipes(query: string): Recipe[] {
    const stmt = this.db.prepare(`
      SELECT * FROM recipes
      WHERE LOWER(name) LIKE LOWER(?)
      ORDER BY name
    `);
    return stmt.all(`%${query}%`) as Recipe[];
  }

  deleteRecipe(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM recipes WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  updateRecipe(id: number, updates: Partial<CreateRecipeInput>): RecipeWithIngredients | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.servings !== undefined) {
      fields.push('servings = ?');
      values.push(updates.servings);
    }
    if (updates.instructions !== undefined) {
      fields.push('instructions = ?');
      values.push(updates.instructions);
    }

    if (fields.length > 0) {
      values.push(id);
      const stmt = this.db.prepare(`
        UPDATE recipes
        SET ${fields.join(', ')}
        WHERE id = ?
      `);
      stmt.run(...values);
    }

    // Update ingredients if provided
    if (updates.ingredients) {
      // Delete existing ingredients
      this.db.prepare('DELETE FROM recipe_ingredients WHERE recipe_id = ?').run(id);

      // Insert new ingredients
      const insertIngredient = this.db.prepare(`
        INSERT INTO recipe_ingredients (recipe_id, food_id, food_type, amount_grams)
        VALUES (?, ?, ?, ?)
      `);

      for (const ingredient of updates.ingredients) {
        insertIngredient.run(
          id,
          ingredient.food_id,
          ingredient.food_type,
          ingredient.amount_grams
        );
      }
    }

    return this.getRecipeById(id);
  }
}
