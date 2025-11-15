import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import {
  DatabaseManager,
  FoodService,
  EntryService,
  FuzzyMatcher,
  MealType,
  FoodType,
} from '@calolog/core';
import { InputParser } from '../parsers/InputParser';

export function registerLogCommand(program: Command) {
  program
    .command('log')
    .description('Log food intake')
    .argument('<input>', 'Food input in format: "quantity unit food_name" (e.g., "200g chicken breast")')
    .option('-m, --meal <type>', 'Meal type: breakfast, lunch, dinner, or snack')
    .option('-d, --date <date>', 'Date (YYYY-MM-DD, defaults to today)')
    .option('-n, --notes <notes>', 'Additional notes')
    .action(async (input: string, options: any) => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const foodService = new FoodService(db);
        const entryService = new EntryService(db);
        const fuzzyMatcher = new FuzzyMatcher(db);

        // Parse input
        const parsed = InputParser.parse(input);
        if ('message' in parsed) {
          console.error(chalk.red('Parse error:'));
          console.error(InputParser.formatError(parsed));
          process.exit(1);
        }

        const { quantity, unit, foodName } = parsed;
        const isServing = InputParser.isServingUnit(unit);

        // Search for food
        let selectedFood: any = null;
        let foodType: FoodType = 'usda';

        // Try exact match first
        const exactMatch = fuzzyMatcher.exactMatch(foodName);
        if (exactMatch) {
          selectedFood = exactMatch;
          console.log(chalk.green(`✓ Found exact match: ${selectedFood.description}`));
        } else {
          // Use fuzzy matching
          const matches = fuzzyMatcher.search(foodName, 10, 0.3);

          if (matches.length === 0) {
            console.error(chalk.red(`No foods found matching "${foodName}"`));
            console.log(chalk.yellow('\nTry a different search term or add a custom food.'));
            process.exit(1);
          }

          // Check if we have a highly confident learned match
          const learnedMatch = matches.find((m: any) => m.isLearned && m.score > 0.8);
          if (learnedMatch) {
            selectedFood = learnedMatch.food;
            console.log(chalk.green(`✓ Using learned selection: ${selectedFood.description}`));
          } else {
            // Present options to user
            console.log(chalk.yellow(`\nFound ${matches.length} matches for "${foodName}":\n`));

            const choices = matches.map((match: any, idx: number) => ({
              name: `${match.food.description}${match.isLearned ? chalk.cyan(' (previously selected)') : ''} ${chalk.gray(`[score: ${match.score.toFixed(2)}]`)}`,
              value: idx,
              short: match.food.description
            }));

            const answer = await inquirer.prompt([
              {
                type: 'list',
                name: 'selection',
                message: 'Select the correct food:',
                choices
              }
            ]);

            selectedFood = matches[answer.selection].food;
            console.log(chalk.green(`✓ Selected: ${selectedFood.description}`));
          }
        }

        // Record user selection for learning
        foodService.recordUserSelection(foodName, selectedFood.id, foodType);

        // Create entry
        const amountGrams = isServing ? undefined : InputParser.convertToGrams(quantity, unit);
        const servings = isServing ? quantity : undefined;

        const entry = entryService.createEntry({
          date: options.date,
          meal_type: options.meal as MealType,
          food_id: selectedFood.id,
          food_type: foodType,
          amount_grams: amountGrams,
          servings: servings,
          notes: options.notes
        });

        console.log(chalk.green('\n✓ Entry logged successfully!'));
        console.log(chalk.gray(`ID: ${entry.id}`));
        console.log(chalk.gray(`Date: ${entry.date}`));
        if (entry.meal_type) {
          console.log(chalk.gray(`Meal: ${entry.meal_type}`));
        }

        // Show nutritional summary
        const foodWithNutrients = foodService.getFoodWithNutrients(selectedFood.id);
        if (foodWithNutrients && foodWithNutrients.nutrients.length > 0) {
          console.log(chalk.cyan('\nNutritional content:'));

          // Show key nutrients (calories, protein, carbs, fat)
          const keyNutrients = ['Energy', 'Protein', 'Carbohydrate', 'Total lipid (fat)'];
          const actualAmount = amountGrams || 100; // Default to 100g if servings

          for (const nutrientName of keyNutrients) {
            const nutrientData = foodWithNutrients.nutrients.find((n: any) =>
              n.nutrient.name.toLowerCase().includes(nutrientName.toLowerCase())
            );

            if (nutrientData) {
              const amount = (nutrientData.amount * actualAmount) / 100;
              console.log(`  ${nutrientData.nutrient.name}: ${amount.toFixed(1)} ${nutrientData.nutrient.unit_name}`);
            }
          }
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
}
