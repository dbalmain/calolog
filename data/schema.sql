-- Calolog Database Schema

-- USDA Foods
CREATE TABLE IF NOT EXISTS foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fdc_id INTEGER UNIQUE,
  description TEXT NOT NULL,
  data_type TEXT,           -- Foundation, SR Legacy, Branded, etc.
  brand_owner TEXT,
  search_vector TEXT,       -- For fuzzy search optimization
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_foods_description ON foods(description);
CREATE INDEX IF NOT EXISTS idx_foods_fdc_id ON foods(fdc_id);
CREATE INDEX IF NOT EXISTS idx_foods_search_vector ON foods(search_vector);

-- Nutrients
CREATE TABLE IF NOT EXISTS nutrients (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nutrient_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  nutrient_number TEXT
);

CREATE INDEX IF NOT EXISTS idx_nutrients_nutrient_id ON nutrients(nutrient_id);
CREATE INDEX IF NOT EXISTS idx_nutrients_name ON nutrients(name);

-- Food Nutrients (join table)
CREATE TABLE IF NOT EXISTS food_nutrients (
  food_id INTEGER,
  nutrient_id INTEGER,
  amount REAL,              -- Per 100g
  PRIMARY KEY (food_id, nutrient_id),
  FOREIGN KEY (food_id) REFERENCES foods(id) ON DELETE CASCADE,
  FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_food_nutrients_food_id ON food_nutrients(food_id);
CREATE INDEX IF NOT EXISTS idx_food_nutrients_nutrient_id ON food_nutrients(nutrient_id);

-- User's custom foods
CREATE TABLE IF NOT EXISTS custom_foods (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS custom_food_nutrients (
  food_id INTEGER,
  nutrient_id INTEGER,
  amount REAL,
  PRIMARY KEY (food_id, nutrient_id),
  FOREIGN KEY (food_id) REFERENCES custom_foods(id) ON DELETE CASCADE,
  FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE
);

-- Recipes
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
  food_id INTEGER,         -- Can reference foods or custom_foods
  food_type TEXT,          -- 'usda' or 'custom'
  amount_grams REAL NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_recipe_ingredients_recipe_id ON recipe_ingredients(recipe_id);

-- Food log entries
CREATE TABLE IF NOT EXISTS entries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  date DATE NOT NULL,
  time TIME,
  meal_type TEXT,          -- breakfast, lunch, dinner, snack
  food_id INTEGER,
  food_type TEXT,          -- 'usda', 'custom', or 'recipe'
  amount_grams REAL,       -- For foods
  servings REAL,           -- For recipes
  notes TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_entries_date ON entries(date);
CREATE INDEX IF NOT EXISTS idx_entries_meal_type ON entries(meal_type);

-- User preferences and learning
CREATE TABLE IF NOT EXISTS user_selections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  query TEXT NOT NULL,     -- What user typed
  selected_food_id INTEGER,
  selected_food_type TEXT,
  selection_count INTEGER DEFAULT 1,
  last_selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_selections_query ON user_selections(query);

-- Nutritional goals
CREATE TABLE IF NOT EXISTS goals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nutrient_id INTEGER,
  daily_target REAL,
  FOREIGN KEY (nutrient_id) REFERENCES nutrients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_goals_nutrient_id ON goals(nutrient_id);

-- User profile (for RDA calculations)
CREATE TABLE IF NOT EXISTS user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row
  age INTEGER,
  gender TEXT,
  weight_kg REAL,
  height_cm REAL,
  activity_level TEXT,     -- sedentary, light, moderate, active, very_active
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
