#!/usr/bin/env node

import { Command } from 'commander';
import { registerLogCommand } from './commands/log';
import { registerTodayCommand } from './commands/today';
import { registerRecipeCommand } from './commands/recipe';
import { registerGoalsCommand } from './commands/goals';

const program = new Command();

program
  .name('calolog')
  .description('A command-line tool for tracking food intake and analyzing nutritional data')
  .version('1.0.0');

// Register commands
registerLogCommand(program);
registerTodayCommand(program);
registerRecipeCommand(program);
registerGoalsCommand(program);

// Parse arguments
program.parse();
