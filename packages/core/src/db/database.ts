import Database from 'better-sqlite3';
import * as path from 'path';
import * as fs from 'fs';

export class DatabaseManager {
  private db: Database.Database;
  private static instance: DatabaseManager;

  private constructor(dbPath: string) {
    // Ensure data directory exists
    const dataDir = path.dirname(dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('foreign_keys = ON');
    this.initializeSchema();
  }

  public static getInstance(dbPath?: string): DatabaseManager {
    if (!DatabaseManager.instance) {
      const defaultPath = dbPath || path.join(process.cwd(), 'data', 'calolog.db');
      DatabaseManager.instance = new DatabaseManager(defaultPath);
    }
    return DatabaseManager.instance;
  }

  private initializeSchema(): void {
    const schemaPath = path.join(process.cwd(), 'data', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);
    } else {
      // Fallback: create basic schema if file doesn't exist
      this.createBasicSchema();
    }
  }

  private createBasicSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS foods (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        fdc_id INTEGER UNIQUE,
        description TEXT NOT NULL,
        data_type TEXT,
        brand_owner TEXT,
        search_vector TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS nutrients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nutrient_id INTEGER UNIQUE,
        name TEXT NOT NULL,
        unit_name TEXT NOT NULL,
        nutrient_number TEXT
      );

      CREATE TABLE IF NOT EXISTS food_nutrients (
        food_id INTEGER,
        nutrient_id INTEGER,
        amount REAL,
        PRIMARY KEY (food_id, nutrient_id),
        FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
        FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS entries (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date DATE NOT NULL,
        time TIME,
        meal_type TEXT,
        food_id INTEGER,
        food_type TEXT,
        amount_grams REAL,
        servings REAL,
        notes TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        servings REAL NOT NULL,
        instructions TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipe_id INTEGER,
        food_id INTEGER,
        food_type TEXT,
        amount_grams REAL NOT NULL,
        FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_selections (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        query TEXT NOT NULL,
        selected_food_id INTEGER,
        selected_food_type TEXT,
        selection_count INTEGER DEFAULT 1,
        last_selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS goals (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        nutrient_id INTEGER,
        daily_target REAL,
        FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE
      );

      CREATE TABLE IF NOT EXISTS user_profile (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        age INTEGER,
        gender TEXT,
        weight_kg REAL,
        height_cm REAL,
        activity_level TEXT,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  public getDatabase(): Database.Database {
    return this.db;
  }

  public close(): void {
    this.db.close();
  }
}
