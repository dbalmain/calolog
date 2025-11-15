# Calolog - Nutritional Tracking CLI Tool

## Project Overview
A command-line tool for tracking food intake and analyzing nutritional data with a focus on macro and micronutrient tracking for fitness and diet goals.

## Tech Stack
- **Language**: TypeScript/Node.js
- **Database**: SQLite
- **Data Source**: USDA FoodData Central (all datasets)
- **Architecture**: Monorepo structure

## Core Features

### 1. Smart Food Logging
- **Semi-structured input**: `calolog log "800g Chicken Breast"`
- **Fuzzy matching**: When exact match not found, present similar options
- **Learning system**: Remember user's previous selections for similar queries
- **Input validation**: Parse quantity + unit + food name with helpful error messages
  - Example: `"800i chicken breast"` → underline "i" and show "unknown unit"
- **Meal categorization**: Optional meal tags (breakfast, lunch, dinner, snack)

### 2. USDA Database Integration
- Download and import all USDA FoodData Central datasets:
  - Foundation Foods
  - SR Legacy (Standard Reference)
  - Branded Foods
  - Survey (FNDDS)
- Comprehensive nutrient tracking (all available nutrients)
- Local SQLite database for fast querying
- User can add custom foods with full nutrient profiles

### 3. Recipe Management
- **Create recipes**: Define combinations of ingredients with quantities
- **Recipe database**: Store custom recipes locally
- **Portion tracking**: Log servings of recipes (e.g., "1 serving lasagna")
- **Nutrient calculation**: Automatic macro/micro calculation from ingredients
- **Recipe scaling**: Adjust serving sizes dynamically

### 4. Goal Tracking & Analysis
- **RDA-based defaults**: Auto-configure based on age/weight/activity level
- **User editable**: Override any nutrient target
- **Daily tracking**: Monitor progress toward daily goals
- **Deficiency alerts**: Smart suggestions (e.g., "you need more iron")
- **Historical reports**: View summaries by day, week, month

### 5. CLI Interface Modes

#### Command-based (fast)
```bash
calolog log "200g chicken breast" --meal lunch
calolog log "1 serving lasagna"
calolog today                    # View today's summary
calolog report --week            # Weekly report
calolog recipe create lasagna    # Create new recipe
calolog goals set                # Configure goals
```

#### Interactive mode (guided)
```bash
calolog                          # Launch interactive mode
> What did you eat? 200g chicken breast
> Which meal? [breakfast/lunch/dinner/snack] lunch
> Added! Nutritional summary: ...
```

## Project Structure (Monorepo)

```
calolog/
├── packages/
│   ├── cli/                     # Main CLI application
│   │   ├── src/
│   │   │   ├── commands/        # CLI commands (log, report, recipe, etc.)
│   │   │   ├── ui/              # Interactive prompts and output formatting
│   │   │   ├── parsers/         # Input parsing and validation
│   │   │   └── index.ts         # CLI entry point
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   ├── core/                    # Core business logic
│   │   ├── src/
│   │   │   ├── db/              # Database schema and queries
│   │   │   ├── models/          # Data models (Food, Recipe, Entry, Goal)
│   │   │   ├── services/        # Business logic (NutritionCalculator, GoalTracker)
│   │   │   ├── fuzzy/           # Fuzzy matching engine
│   │   │   └── index.ts
│   │   ├── package.json
│   │   └── tsconfig.json
│   │
│   └── importer/                # USDA data import scripts
│       ├── src/
│       │   ├── downloaders/     # Download USDA datasets
│       │   ├── parsers/         # Parse USDA JSON/CSV files
│       │   ├── importers/       # Import into SQLite
│       │   └── index.ts
│       ├── package.json
│       └── tsconfig.json
│
├── data/                        # SQLite database and USDA downloads
│   ├── calolog.db              # Main database (gitignored)
│   ├── usda/                   # Downloaded USDA data (gitignored)
│   └── schema.sql              # Database schema
│
├── docs/                        # Documentation
│   ├── usage.md
│   ├── recipes.md
│   └── api.md
│
├── package.json                 # Root package.json for workspace
├── tsconfig.json               # Root TypeScript config
├── turbo.json                  # Turborepo configuration
├── .gitignore
└── README.md
```

## Database Schema

### Core Tables

```sql
-- USDA Foods
CREATE TABLE foods (
  id INTEGER PRIMARY KEY,
  fdc_id INTEGER UNIQUE,
  description TEXT NOT NULL,
  data_type TEXT,           -- Foundation, SR Legacy, Branded, etc.
  brand_owner TEXT,
  search_vector TEXT,       -- For fuzzy search optimization
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nutrients
CREATE TABLE nutrients (
  id INTEGER PRIMARY KEY,
  nutrient_id INTEGER UNIQUE,
  name TEXT NOT NULL,
  unit_name TEXT NOT NULL,
  nutrient_number TEXT
);

-- Food Nutrients (join table)
CREATE TABLE food_nutrients (
  food_id INTEGER,
  nutrient_id INTEGER,
  amount REAL,              -- Per 100g
  PRIMARY KEY (food_id, nutrient_id),
  FOREIGN KEY (food_id) REFERENCES foods(id),
  FOREIGN KEY (nutrient_id) REFERENCES nutrients(id)
);

-- User's custom foods
CREATE TABLE custom_foods (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_food_nutrients (
  food_id INTEGER,
  nutrient_id INTEGER,
  amount REAL,
  PRIMARY KEY (food_id, nutrient_id),
  FOREIGN KEY (food_id) REFERENCES custom_foods(id),
  FOREIGN KEY (nutrient_id) REFERENCES nutrients(id)
);

-- Recipes
CREATE TABLE recipes (
  id INTEGER PRIMARY KEY,
  name TEXT NOT NULL,
  servings REAL NOT NULL,
  instructions TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE recipe_ingredients (
  id INTEGER PRIMARY KEY,
  recipe_id INTEGER,
  food_id INTEGER,         -- Can reference foods or custom_foods
  food_type TEXT,          -- 'usda' or 'custom'
  amount_grams REAL NOT NULL,
  FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);

-- Food log entries
CREATE TABLE entries (
  id INTEGER PRIMARY KEY,
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

-- User preferences and learning
CREATE TABLE user_selections (
  id INTEGER PRIMARY KEY,
  query TEXT NOT NULL,     -- What user typed
  selected_food_id INTEGER,
  selected_food_type TEXT,
  selection_count INTEGER DEFAULT 1,
  last_selected_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Nutritional goals
CREATE TABLE goals (
  id INTEGER PRIMARY KEY,
  nutrient_id INTEGER,
  daily_target REAL,
  FOREIGN KEY (nutrient_id) REFERENCES nutrients(id)
);

-- User profile (for RDA calculations)
CREATE TABLE user_profile (
  id INTEGER PRIMARY KEY CHECK (id = 1), -- Single row
  age INTEGER,
  gender TEXT,
  weight_kg REAL,
  height_cm REAL,
  activity_level TEXT,     -- sedentary, light, moderate, active, very_active
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## Implementation Phases

### Phase 1: Foundation (MVP Core)
**Goal**: Basic logging and data infrastructure

1. **Project Setup**
   - Initialize monorepo with Turborepo
   - Setup TypeScript configuration
   - Create package structure (cli, core, importer)
   - Setup SQLite with initial schema

2. **USDA Data Import**
   - Download USDA FoodData Central datasets
   - Parse and import into SQLite
   - Create indexes for performance
   - Verify data integrity

3. **Basic Food Logging**
   - Input parser for "quantity unit food_name" format
   - SQLite queries for food lookup
   - Basic fuzzy matching (Levenshtein distance)
   - Save entries to database

4. **CLI Framework**
   - Setup CLI with commands (log, today, list)
   - Basic output formatting
   - Error handling and validation

**Deliverable**: Can log foods and view basic daily summary

### Phase 2: Smart Features
**Goal**: Fuzzy matching and learning system

1. **Enhanced Fuzzy Matching**
   - Implement better fuzzy search (trigram similarity)
   - Present top N matches when no exact match
   - Interactive selection from options

2. **Learning System**
   - Track user selections in user_selections table
   - Prioritize previously selected foods
   - Auto-select if user has chosen same option 3+ times

3. **Input Validation**
   - Better error messages with position indicators
   - Support multiple unit types (g, kg, oz, lb, cups, etc.)
   - Unit conversion utilities

**Deliverable**: Intelligent food logging with learning

### Phase 3: Recipes & Nutrition Calculation
**Goal**: Recipe management and comprehensive nutrition tracking

1. **Recipe Creation**
   - Interactive recipe builder
   - Add ingredients with quantities
   - Calculate per-serving nutrition
   - Store recipes in database

2. **Recipe Logging**
   - Log recipe servings like regular foods
   - Support partial servings (0.5 servings)

3. **Nutrition Calculator**
   - Aggregate all nutrients for entries
   - Calculate daily totals
   - Support all USDA nutrients

**Deliverable**: Full recipe support and comprehensive tracking

### Phase 4: Goals & Analysis
**Goal**: Goal tracking and intelligent suggestions

1. **User Profile Setup**
   - Interactive profile configuration
   - RDA calculation based on profile

2. **Goal Management**
   - Set default goals from RDA
   - Allow manual override
   - CRUD operations for goals

3. **Analysis & Reporting**
   - Daily summary with goal progress
   - Identify nutrient deficiencies
   - Suggestions for improvement
   - Historical reports (week, month)

4. **Visualization**
   - ASCII charts for nutrients
   - Progress bars for goals
   - Trend indicators

**Deliverable**: Complete goal tracking and analysis system

### Phase 5: Polish & Optimization
**Goal**: Production-ready tool

1. **Performance Optimization**
   - Database query optimization
   - Caching for frequently accessed data
   - Fast startup time

2. **User Experience**
   - Better interactive mode
   - Helpful error messages
   - Command aliases and shortcuts
   - Auto-completion support

3. **Documentation**
   - User guide
   - Recipe examples
   - API documentation

4. **Testing**
   - Unit tests for core logic
   - Integration tests for database
   - CLI command tests

**Deliverable**: Polished, production-ready CLI tool

## Technical Considerations

### Parsing Strategy
Use a simple regex-based parser initially:
```
/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/
```
- Group 1: Quantity (number)
- Group 2: Unit (g, kg, oz, etc.)
- Group 3: Food name

Error reporting shows position of parse failure.

### Fuzzy Matching Algorithm
1. Exact match check first (case-insensitive)
2. Trigram similarity for close matches
3. Consider user's previous selections
4. Return top 5 matches above threshold (0.3 similarity)
5. Present to user for selection

### Unit Conversion
Support common units and convert to grams:
- Metric: g, kg, mg
- Imperial: oz, lb
- Volume: cup, tbsp, tsp, ml, l
  - (Requires density lookups or defaults)

### Performance Targets
- CLI startup: < 100ms
- Food search: < 50ms
- Daily summary: < 100ms
- Recipe calculation: < 200ms

### Data Management
- USDA data stored in `data/usda/` (gitignored, ~500MB)
- SQLite database in `data/calolog.db` (gitignored)
- Provide import script to setup database
- Document USDA data source and update process

## MVP Success Criteria

1. ✅ User can log foods with semi-structured input
2. ✅ Fuzzy matching presents options when no exact match
3. ✅ System learns and remembers user selections
4. ✅ Users can create and log recipes
5. ✅ Daily summary shows all tracked nutrients
6. ✅ Goal tracking with RDA-based defaults
7. ✅ Deficiency warnings and suggestions
8. ✅ Historical reporting (day, week, month)
9. ✅ Input validation with helpful error messages
10. ✅ Both command-based and interactive modes work

## Future Enhancements (Post-MVP)
- Export data (CSV, JSON)
- Import from other tracking apps
- Barcode scanning support (requires camera/phone integration)
- Web dashboard for visualization
- Multi-user support
- Cloud sync
- Meal planning features
- Shopping list generation
- Integration with fitness trackers
- Mobile app (React Native sharing core package)

## Resources

### USDA FoodData Central
- Website: https://fdc.nal.usda.gov/
- API Docs: https://fdc.nal.usda.gov/api-guide.html
- Download: https://fdc.nal.usda.gov/download-datasets.html
- Data types: Foundation, SR Legacy, Branded, Survey (FNDDS)

### Libraries to Consider
- **CLI Framework**: commander or yargs
- **Interactive Prompts**: inquirer or prompts
- **Fuzzy Search**: fuse.js or custom implementation
- **SQLite**: better-sqlite3
- **Testing**: vitest or jest
- **Validation**: zod
- **Output Formatting**: chalk, cli-table3, boxen
- **Progress Indicators**: ora
- **Charts**: asciichart

### Testing Datasets
Create small test datasets for development:
- 100 common foods for quick testing
- 3-5 sample recipes
- 1 week of mock entries

## Getting Started (For Development)

```bash
# Clone and setup
git clone <repo-url>
cd calolog
npm install

# Download and import USDA data
npm run import-usda

# Run CLI in development
npm run dev -- log "200g chicken breast"

# Run tests
npm test

# Build for distribution
npm run build

# Install globally
npm install -g .

# Use anywhere
calolog log "1 serving lasagna"
```

## Summary

This plan outlines a comprehensive nutritional tracking CLI tool with intelligent food matching, recipe management, and goal tracking. The monorepo structure allows for code reuse and potential future expansion (web app, mobile app). The phased approach ensures we build a solid foundation before adding advanced features.

The key differentiators are:
1. **Smart input parsing** with helpful error messages
2. **Learning system** that remembers user preferences
3. **Comprehensive nutrition tracking** (all USDA nutrients)
4. **Recipe support** for real-world meal logging
5. **Intelligent suggestions** based on nutrient deficiencies
6. **Fast, local-first** design with no internet required after setup
