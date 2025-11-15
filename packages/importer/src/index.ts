import * as path from 'path';
import chalk from 'chalk';
import ora from 'ora';
import { DatabaseManager } from '@calolog/core';
import { USDADownloader } from './downloaders/USDADownloader';
import { USDAParser } from './parsers/USDAParser';
import { USDAImporter } from './importers/USDAImporter';

async function main() {
  console.log(chalk.bold('\n🍎 USDA Food Data Importer\n'));

  const dataDir = path.join(process.cwd(), 'data', 'usda');
  const dbPath = path.join(process.cwd(), 'data', 'calolog.db');

  // Initialize database
  const spinner = ora('Initializing database...').start();
  const dbManager = DatabaseManager.getInstance(dbPath);
  const db = dbManager.getDatabase();
  spinner.succeed('Database initialized');

  const importer = new USDAImporter(db);

  // Check if database already has data
  const stats = importer.getStatistics();
  if (stats.totalFoods > 0) {
    console.log(chalk.yellow(`\nDatabase already contains ${stats.totalFoods} foods.`));
    console.log(chalk.yellow('Do you want to continue? This may add duplicate data.'));
    console.log(chalk.gray('Press Ctrl+C to cancel, or wait 5 seconds to continue...'));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // For now, create a sample dataset
  // In a real implementation, you would download and parse actual USDA data
  console.log(chalk.cyan('\nCreating sample dataset...'));
  console.log(chalk.gray('For full USDA data, download from: https://fdc.nal.usda.gov/download-datasets.html'));
  console.log(chalk.gray('and place JSON files in: ' + dataDir));

  importer.createSampleDataset();

  // Show statistics
  const finalStats = importer.getStatistics();
  console.log(chalk.green('\n✓ Import complete!\n'));
  console.log(chalk.bold('Statistics:'));
  console.log(`  Total Foods: ${finalStats.totalFoods}`);
  console.log(`  Total Nutrients: ${finalStats.totalNutrients}`);
  console.log(chalk.bold('\n  Foods by Type:'));
  for (const [type, count] of Object.entries(finalStats.foodsByType)) {
    console.log(`    ${type}: ${count}`);
  }

  console.log(chalk.cyan('\n📝 Next steps:'));
  console.log('  1. Set up your profile: calolog goals set');
  console.log('  2. Log some food: calolog log "200g chicken breast"');
  console.log('  3. View your summary: calolog today');

  dbManager.close();
}

main().catch(error => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
