# Calolog

A command-line nutritional tracking tool for logging food intake and analyzing macros and micronutrients.

## Features

- 🥗 **Smart Food Logging**: Semi-structured input with fuzzy matching
- 🧠 **Learning System**: Remembers your food preferences
- 📊 **Comprehensive Tracking**: All macros and micros from USDA database
- 🍝 **Recipe Management**: Create and log custom recipes
- 🎯 **Goal Tracking**: RDA-based nutritional goals with smart suggestions
- 📈 **Reporting**: Daily summaries with deficiency warnings
- ⚡ **Fast & Local**: SQLite database, no internet required after setup

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd calolog

# Install dependencies
npm install

# Build all packages
npm run build

# Import USDA data (downloads ~100-200MB of real data)
# This will download Foundation Foods and SR Legacy datasets
# Falls back to sample dataset if download fails
npm run import-usda
```

## Quick Start

### 1. Set Up Your Profile

First, configure your profile to get personalized RDA-based goals:

```bash
node packages/cli/dist/index.js goals set
```

You'll be prompted for:
- Age
- Gender
- Weight (kg)
- Height (cm)
- Activity level

### 2. Log Food

Log food with simple, natural input:

```bash
# Basic food logging
node packages/cli/dist/index.js log "200g chicken breast"

# With meal type
node packages/cli/dist/index.js log "300g rice" --meal lunch

# With notes
node packages/cli/dist/index.js log "150g broccoli" --meal dinner --notes "steamed"

# Different units
node packages/cli/dist/index.js log "2 eggs"  # uses servings
node packages/cli/dist/index.js log "1 cup milk"
node packages/cli/dist/index.js log "8oz salmon"
```

Supported units: `g`, `kg`, `oz`, `lb`, `cup`, `tbsp`, `tsp`, `ml`, `l`, `serving`

### 3. View Your Summary

See today's nutritional summary:

```bash
node packages/cli/dist/index.js today

# View specific date
node packages/cli/dist/index.js today --date 2024-01-15
```

### 4. Create Recipes

Create custom recipes:

```bash
node packages/cli/dist/index.js recipe create

# List all recipes
node packages/cli/dist/index.js recipe list

# View recipe details
node packages/cli/dist/index.js recipe show <id>
```

### 5. Manage Goals

```bash
# View all goals
node packages/cli/dist/index.js goals list

# Update a specific goal
node packages/cli/dist/index.js goals update "Protein" 150
```

## How It Works

### Smart Food Matching

Calolog uses fuzzy matching to find foods:

1. **Exact Match**: If your input exactly matches a food name, it's selected automatically
2. **Fuzzy Search**: If no exact match, it shows similar options
3. **Learning**: After you select a food, it remembers your choice for next time

Example:
```bash
node packages/cli/dist/index.js log "200g chiken"
# Shows: "Did you mean: Chicken, breast, meat only, raw?"
```

### Nutritional Tracking

- Tracks all nutrients from USDA database
- Shows macros (protein, carbs, fat) and calories for each entry
- Daily summaries show progress toward goals
- Highlights deficiencies (nutrients < 80% of goal)

### Recipe Support

Create recipes with multiple ingredients:
- Automatically calculates per-serving nutrition
- Can log partial servings (e.g., "0.5 serving lasagna")
- Nutrition scales with serving size

## Project Structure

This is a TypeScript monorepo with three packages:

```
calolog/
├── packages/
│   ├── cli/              # Command-line interface
│   ├── core/             # Business logic and database
│   └── importer/         # USDA data import tools
├── data/
│   ├── calolog.db        # SQLite database (gitignored)
│   └── schema.sql        # Database schema
└── PLAN.md              # Detailed implementation plan
```

### Packages

- **@calolog/core**: Database management, models, services, and fuzzy matching
- **@calolog/cli**: Commander-based CLI with inquirer prompts
- **@calolog/importer**: USDA data downloader and importer

## Development

```bash
# Build all packages
npm run build

# Build specific package
npm run build --workspace=packages/cli

# Watch mode (auto-rebuild)
npm run dev --workspace=packages/core

# Run tests (when implemented)
npm test
```

## Data Sources

### USDA FoodData Central

Running `npm run import-usda` automatically downloads and imports:
- **Foundation Foods**: ~600 foods with comprehensive nutrient data
- **SR Legacy**: ~7,000+ foods from the legacy Standard Reference database

The importer will:
1. Download datasets from USDA (~100-200MB total)
2. Extract and parse JSON files
3. Import all foods and nutrients into SQLite
4. Fall back to sample dataset (8 foods) if download fails

Additional datasets can be added by:
1. Manually downloading from: https://fdc.nal.usda.gov/download-datasets.html
2. Placing JSON files in `data/usda/`
3. Updating `packages/importer/src/parsers/USDAParser.ts` if needed

Available datasets:
- Foundation Foods (auto-downloaded)
- SR Legacy (auto-downloaded)
- Branded Foods (70,000+ foods, manual download)
- Survey/FNDDS (manual download)

## Architecture

See [PLAN.md](./PLAN.md) for complete architecture details, including:
- Database schema
- Service layer design
- Fuzzy matching algorithm
- RDA calculation methods
- Future enhancements

## License

MIT
