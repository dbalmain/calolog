import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  DatabaseManager,
  GoalService,
  FoodService,
} from '@calolog/core';

export function registerGoalsCommand(program: Command) {
  const goals = program
    .command('goals')
    .description('Manage nutritional goals');

  goals
    .command('set')
    .description('Set up user profile and default goals')
    .action(async () => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const goalService = new GoalService(db);

        console.log(chalk.bold('\n⚙️  User Profile Setup\n'));

        const answers = await inquirer.prompt([
          {
            type: 'number',
            name: 'age',
            message: 'Age:',
            validate: (input: number) => input > 0 && input < 150 || 'Please enter a valid age'
          },
          {
            type: 'list',
            name: 'gender',
            message: 'Gender:',
            choices: ['male', 'female']
          },
          {
            type: 'number',
            name: 'weight_kg',
            message: 'Weight (kg):',
            validate: (input: number) => input > 0 || 'Please enter a valid weight'
          },
          {
            type: 'number',
            name: 'height_cm',
            message: 'Height (cm):',
            validate: (input: number) => input > 0 || 'Please enter a valid height'
          },
          {
            type: 'list',
            name: 'activity_level',
            message: 'Activity level:',
            choices: [
              { name: 'Sedentary (little or no exercise)', value: 'sedentary' },
              { name: 'Light (exercise 1-3 days/week)', value: 'light' },
              { name: 'Moderate (exercise 3-5 days/week)', value: 'moderate' },
              { name: 'Active (exercise 6-7 days/week)', value: 'active' },
              { name: 'Very Active (hard exercise & physical job)', value: 'very_active' }
            ]
          }
        ]);

        const profile = goalService.createOrUpdateProfile(answers);

        console.log(chalk.green('\n✓ Profile saved successfully!'));

        // Set default goals
        goalService.setDefaultGoals();

        console.log(chalk.green('✓ Default nutritional goals have been set based on RDA recommendations.'));
        console.log(chalk.gray('\nUse "calolog goals list" to view your goals.'));
        console.log(chalk.gray('Use "calolog goals update <nutrient> <target>" to customize specific goals.'));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  goals
    .command('list')
    .description('List all nutritional goals')
    .action(async () => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const goalService = new GoalService(db);
        const foodService = new FoodService(db);

        const allGoals = goalService.getAllGoals();

        if (allGoals.length === 0) {
          console.log(chalk.yellow('No goals set.'));
          console.log(chalk.gray('\nUse "calolog goals set" to configure your profile and goals.'));
          return;
        }

        console.log(chalk.bold(`\n🎯 Nutritional Goals (${allGoals.length})\n`));

        const table = new Table({
          head: ['ID', 'Nutrient', 'Daily Target', 'Unit'],
          style: { head: ['cyan'] }
        });

        for (const goal of allGoals) {
          const nutrient = foodService.getNutrientById(goal.nutrient_id);
          if (nutrient) {
            table.push([
              goal.id,
              nutrient.name,
              goal.daily_target.toFixed(1),
              nutrient.unit_name
            ]);
          }
        }

        console.log(table.toString());

        // Show profile
        const profile = goalService.getProfile();
        if (profile) {
          console.log(chalk.cyan('\nUser Profile:'));
          console.log(`  Age: ${profile.age || 'Not set'}`);
          console.log(`  Gender: ${profile.gender || 'Not set'}`);
          console.log(`  Weight: ${profile.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}`);
          console.log(`  Height: ${profile.height_cm ? `${profile.height_cm} cm` : 'Not set'}`);
          console.log(`  Activity Level: ${profile.activity_level || 'Not set'}`);
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  goals
    .command('update')
    .description('Update a specific nutritional goal')
    .argument('<nutrient>', 'Nutrient name')
    .argument('<target>', 'Daily target value')
    .action(async (nutrientName: string, targetStr: string) => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const goalService = new GoalService(db);
        const foodService = new FoodService(db);

        const target = parseFloat(targetStr);
        if (isNaN(target) || target < 0) {
          console.log(chalk.red('Invalid target value. Must be a positive number.'));
          process.exit(1);
        }

        const nutrient = foodService.getNutrientByName(nutrientName);
        if (!nutrient) {
          console.log(chalk.red(`Nutrient "${nutrientName}" not found.`));
          console.log(chalk.gray('\nUse "calolog goals list" to see available nutrients.'));
          process.exit(1);
        }

        const existingGoal = goalService.getGoalByNutrientId(nutrient.id);

        if (existingGoal) {
          goalService.updateGoal(existingGoal.id, target);
          console.log(chalk.green(`✓ Updated goal for ${nutrient.name}: ${target} ${nutrient.unit_name}`));
        } else {
          goalService.createGoal({
            nutrient_id: nutrient.id,
            daily_target: target
          });
          console.log(chalk.green(`✓ Created goal for ${nutrient.name}: ${target} ${nutrient.unit_name}`));
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
}
