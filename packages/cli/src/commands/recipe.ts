import { Command } from 'commander';
import inquirer from 'inquirer';
import chalk from 'chalk';
import Table from 'cli-table3';
import {
  DatabaseManager,
  RecipeService,
  FoodService,
  FuzzyMatcher,
  CreateRecipeInput,
  FoodType,
} from '@calolog/core';

export function registerRecipeCommand(program: Command) {
  const recipe = program
    .command('recipe')
    .description('Manage recipes');

  recipe
    .command('create')
    .description('Create a new recipe')
    .argument('[name]', 'Recipe name')
    .action(async (name?: string) => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const recipeService = new RecipeService(db);
        const foodService = new FoodService(db);
        const fuzzyMatcher = new FuzzyMatcher(db);

        // Get recipe name
        let recipeName = name;
        if (!recipeName) {
          const answer = await inquirer.prompt([
            {
              type: 'input',
              name: 'name',
              message: 'Recipe name:',
              validate: (input: string) => input.trim().length > 0 || 'Name is required'
            }
          ]);
          recipeName = answer.name;
        }

        // Get servings
        const servingsAnswer = await inquirer.prompt([
          {
            type: 'number',
            name: 'servings',
            message: 'Number of servings:',
            default: 1,
            validate: (input: number) => input > 0 || 'Servings must be greater than 0'
          }
        ]);

        // Get ingredients
        const ingredients: Array<{ food_id: number; food_type: FoodType; amount_grams: number }> = [];
        let addingIngredients = true;

        console.log(chalk.cyan('\nAdd ingredients (enter food name and amount):'));

        while (addingIngredients) {
          const ingredientAnswer = await inquirer.prompt([
            {
              type: 'input',
              name: 'ingredient',
              message: 'Ingredient (format: "200g chicken breast", or leave empty to finish):',
            }
          ]);

          if (!ingredientAnswer.ingredient.trim()) {
            addingIngredients = false;
            continue;
          }

          // Parse ingredient
          const match = ingredientAnswer.ingredient.match(/^(\d+(?:\.\d+)?)\s*g\s+(.+)$/);
          if (!match) {
            console.log(chalk.red('Invalid format. Use: "amount(g) food_name" (e.g., "200g chicken breast")'));
            continue;
          }

          const [, amountStr, foodName] = match;
          const amount = parseFloat(amountStr);

          // Search for food
          const matches = fuzzyMatcher.search(foodName, 5, 0.3);
          if (matches.length === 0) {
            console.log(chalk.red(`No foods found matching "${foodName}"`));
            continue;
          }

          let selectedFood;
          if (matches.length === 1 || (matches[0].isLearned && matches[0].score > 0.8)) {
            selectedFood = matches[0].food;
            console.log(chalk.green(`✓ Selected: ${selectedFood.description}`));
          } else {
            const choices = matches.map((match: any, idx: number) => ({
              name: `${match.food.description}${match.isLearned ? chalk.cyan(' (previously selected)') : ''}`,
              value: idx
            }));

            const selection = await inquirer.prompt([
              {
                type: 'list',
                name: 'food',
                message: 'Select food:',
                choices
              }
            ]);

            selectedFood = matches[selection.food].food;
          }

          ingredients.push({
            food_id: selectedFood.id,
            food_type: 'usda',
            amount_grams: amount
          });

          console.log(chalk.green(`✓ Added: ${amount}g ${selectedFood.description}`));
        }

        if (ingredients.length === 0) {
          console.log(chalk.red('Recipe must have at least one ingredient.'));
          process.exit(1);
        }

        // Get instructions (optional)
        const instructionsAnswer = await inquirer.prompt([
          {
            type: 'input',
            name: 'instructions',
            message: 'Instructions (optional):',
          }
        ]);

        // Create recipe
        const recipeInput: CreateRecipeInput = {
          name: recipeName!,
          servings: servingsAnswer.servings,
          instructions: instructionsAnswer.instructions || undefined,
          ingredients
        };

        const createdRecipe = recipeService.createRecipe(recipeInput);

        console.log(chalk.green('\n✓ Recipe created successfully!'));
        console.log(chalk.gray(`ID: ${createdRecipe.id}`));
        console.log(chalk.gray(`Name: ${createdRecipe.name}`));
        console.log(chalk.gray(`Servings: ${createdRecipe.servings}`));
        console.log(chalk.gray(`Ingredients: ${createdRecipe.ingredients.length}`));

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  recipe
    .command('list')
    .description('List all recipes')
    .action(async () => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const recipeService = new RecipeService(db);

        const recipes = recipeService.getAllRecipes();

        if (recipes.length === 0) {
          console.log(chalk.yellow('No recipes found.'));
          console.log(chalk.gray('\nUse "calolog recipe create" to add recipes.'));
          return;
        }

        console.log(chalk.bold(`\n📖 Recipes (${recipes.length})\n`));

        const table = new Table({
          head: ['ID', 'Name', 'Servings'],
          style: { head: ['cyan'] }
        });

        for (const recipe of recipes) {
          table.push([recipe.id, recipe.name, recipe.servings]);
        }

        console.log(table.toString());

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });

  recipe
    .command('show')
    .description('Show recipe details')
    .argument('<id>', 'Recipe ID')
    .action(async (id: string) => {
      try {
        const dbManager = DatabaseManager.getInstance();
        const db = dbManager.getDatabase();
        const recipeService = new RecipeService(db);
        const foodService = new FoodService(db);

        const recipe = recipeService.getRecipeById(parseInt(id));

        if (!recipe) {
          console.log(chalk.red(`Recipe with ID ${id} not found.`));
          process.exit(1);
        }

        console.log(chalk.bold(`\n📖 ${recipe.name}\n`));
        console.log(chalk.gray(`ID: ${recipe.id}`));
        console.log(chalk.gray(`Servings: ${recipe.servings}`));

        if (recipe.instructions) {
          console.log(chalk.gray(`Instructions: ${recipe.instructions}`));
        }

        console.log(chalk.cyan('\nIngredients:'));
        for (const ingredient of recipe.ingredients) {
          const food = foodService.getFoodById(ingredient.food_id);
          if (food) {
            console.log(`  • ${ingredient.amount_grams}g ${food.description}`);
          }
        }

      } catch (error: any) {
        console.error(chalk.red('Error:'), error.message);
        process.exit(1);
      }
    });
}
