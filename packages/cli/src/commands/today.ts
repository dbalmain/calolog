import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  DatabaseManager,
  EntryService,
  FoodService,
  NutritionCalculator,
  GoalService,
} from '@calolog/core';

export function registerTodayCommand(program: Command) {
  program
    .command('today')
    .description('Show today\'s food log and nutritional summary')
    .option('-d, --date <date>', 'Show summary for specific date (YYYY-MM-DD)')
    .action(async (options: any) => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const entryService = new EntryService(db);
        const foodService = new FoodService(db);
        const nutritionCalculator = new NutritionCalculator(db);
        const goalService = new GoalService(db);

        const date = options.date || new Date().toISOString().split('T')[0];
        console.log(chalk.bold(`\n📅 Food Log for ${date}\n`));

        // Get entries
        const entries = entryService.getEntriesByDate(date);

        if (entries.length === 0) {
          console.log(chalk.yellow('No entries logged for this date.'));
          console.log(chalk.gray('\nUse "calolog log" to add food entries.'));
          return;
        }

        // Display entries by meal
        const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack', null];

        for (const mealType of mealTypes) {
          const mealEntries = entries.filter((e: any) => e.meal_type === mealType);
          if (mealEntries.length === 0) continue;

          const mealName = mealType ? mealType.charAt(0).toUpperCase() + mealType.slice(1) : 'Unspecified';
          console.log(chalk.cyan(`\n${mealName}:`));

          for (const entry of mealEntries) {
            const food = foodService.getFoodById(entry.food_id);
            if (food) {
              const amount = entry.amount_grams
                ? `${entry.amount_grams}g`
                : `${entry.servings} serving${entry.servings !== 1 ? 's' : ''}`;

              console.log(`  • ${food.description} - ${amount}`);
              if (entry.notes) {
                console.log(chalk.gray(`    Note: ${entry.notes}`));
              }
            }
          }
        }

        // Nutritional summary
        console.log(chalk.bold('\n📊 Nutritional Summary\n'));

        const summary = nutritionCalculator.calculateDailySummary(date);

        // Show total calories
        console.log(chalk.cyan(`Total Calories: ${summary.totalCalories.toFixed(0)} kcal\n`));

        // Show macros
        const macros = ['Protein', 'Carbohydrate', 'Total lipid (fat)', 'Fiber'];
        const macroTable = new Table({
          head: ['Nutrient', 'Amount', 'Goal', 'Progress'],
          style: { head: ['cyan'] }
        });

        for (const macroName of macros) {
          const nutrient = summary.nutrients.find((n: any) =>
            n.nutrient.name.toLowerCase().includes(macroName.toLowerCase())
          );

          if (nutrient && nutrient.amount > 0) {
            const goal = nutrient.goal ? `${nutrient.goal.toFixed(0)} ${nutrient.nutrient.unit_name}` : '-';
            const progress = nutrient.percentOfGoal
              ? `${nutrient.percentOfGoal.toFixed(0)}%`
              : '-';

            macroTable.push([
              nutrient.nutrient.name,
              `${nutrient.amount.toFixed(1)} ${nutrient.nutrient.unit_name}`,
              goal,
              progress
            ]);
          }
        }

        console.log(macroTable.toString());

        // Show deficiencies
        const deficiencies = nutritionCalculator.getDeficientNutrients(date, 80);
        if (deficiencies.length > 0) {
          console.log(chalk.yellow('\n⚠️  Nutrient deficiencies (< 80% of goal):\n'));

          const defTable = new Table({
            head: ['Nutrient', 'Current', 'Goal', '%'],
            style: { head: ['yellow'] }
          });

          for (const def of deficiencies.slice(0, 10)) {
            const current = summary.nutrients.find((n: any) => n.nutrient.id === def.nutrient.id);
            if (current) {
              defTable.push([
                def.nutrient.name,
                `${current.amount.toFixed(1)} ${def.nutrient.unit_name}`,
                `${def.goal.toFixed(0)} ${def.nutrient.unit_name}`,
                `${def.percent.toFixed(0)}%`
              ]);
            }
          }

          console.log(defTable.toString());
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
}
