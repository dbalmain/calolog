# Calolog

A command-line nutritional tracking tool for logging food intake and analyzing macros and micronutrients.

## Features (Planned)

- 🥗 **Smart Food Logging**: Semi-structured input with fuzzy matching
- 🧠 **Learning System**: Remembers your food preferences
- 📊 **Comprehensive Tracking**: All macros and micros from USDA database
- 🍝 **Recipe Management**: Create and log custom recipes
- 🎯 **Goal Tracking**: RDA-based nutritional goals with smart suggestions
- 📈 **Historical Reports**: Daily, weekly, and monthly summaries
- ⚡ **Fast & Local**: SQLite database, no internet required after setup

## Quick Start

```bash
# Log food (coming soon)
calolog log "200g chicken breast" --meal lunch
calolog log "1 serving lasagna"

# View today's summary
calolog today

# Create a recipe
calolog recipe create lasagna

# Set nutritional goals
calolog goals set
```

## Project Status

🚧 **In Planning Phase** - See [PLAN.md](./PLAN.md) for detailed implementation plan.

## Development

This project uses a monorepo structure with:
- `packages/cli` - Command-line interface
- `packages/core` - Core business logic
- `packages/importer` - USDA data import tools

See [PLAN.md](./PLAN.md) for complete architecture and implementation details.

## License

MIT
