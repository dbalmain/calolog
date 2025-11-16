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

  const downloader = new USDADownloader(dataDir);
  const parser = new USDAParser();
  const importer = new USDAImporter(db);

  // Check if database already has data
  const stats = importer.getStatistics();
  if (stats.totalFoods > 0) {
    console.log(chalk.yellow(`\nDatabase already contains ${stats.totalFoods} foods.`));
    console.log(chalk.yellow('Do you want to continue? This may add duplicate data.'));
    console.log(chalk.gray('Press Ctrl+C to cancel, or wait 5 seconds to continue...'));
    await new Promise(resolve => setTimeout(resolve, 5000));
  }

  // Download USDA datasets
  console.log(chalk.cyan('\n📥 Downloading USDA datasets...\n'));
  console.log(chalk.gray('This will download Foundation Foods and SR Legacy datasets (~100-200MB)'));
  console.log(chalk.gray('Press Ctrl+C to cancel, or wait 3 seconds to continue...'));
  await new Promise(resolve => setTimeout(resolve, 3000));

  try {
    // Download Foundation Foods
    let downloadSpinner = ora('Downloading Foundation Foods...').start();
    const foundationPath = await downloader.downloadDataset('foundation');
    downloadSpinner.succeed('Foundation Foods downloaded');

    // Download SR Legacy
    downloadSpinner = ora('Downloading SR Legacy...').start();
    const srLegacyPath = await downloader.downloadDataset('sr_legacy');
    downloadSpinner.succeed('SR Legacy downloaded');

    // Parse and import Foundation Foods
    console.log(chalk.cyan('\n📝 Parsing and importing data...\n'));

    const foundationFiles = parser.findJSONFiles(foundationPath);
    if (foundationFiles.length > 0) {
      let parseSpinner = ora(`Parsing ${foundationFiles.length} Foundation Foods files...`).start();
      let totalFoods: any[] = [];

      for (const file of foundationFiles) {
        try {
          const foods = parser.parseJSONFile(file);
          totalFoods = totalFoods.concat(foods);
        } catch (error: any) {
          parseSpinner.warn(`Error parsing ${path.basename(file)}: ${error.message}`);
        }
      }

      parseSpinner.succeed(`Parsed ${totalFoods.length} foods from Foundation Foods`);

      const importSpinner = ora('Importing Foundation Foods to database...').start();
      const result = importer.importFoods(totalFoods);
      importSpinner.succeed(`Imported ${result.imported} Foundation Foods (${result.skipped} skipped)`);
    }

    // Parse and import SR Legacy
    const srLegacyFiles = parser.findJSONFiles(srLegacyPath);
    if (srLegacyFiles.length > 0) {
      let parseSpinner = ora(`Parsing ${srLegacyFiles.length} SR Legacy files...`).start();
      let totalFoods: any[] = [];

      for (const file of srLegacyFiles) {
        try {
          const foods = parser.parseJSONFile(file);
          totalFoods = totalFoods.concat(foods);
        } catch (error: any) {
          parseSpinner.warn(`Error parsing ${path.basename(file)}: ${error.message}`);
        }
      }

      parseSpinner.succeed(`Parsed ${totalFoods.length} foods from SR Legacy`);

      const importSpinner = ora('Importing SR Legacy to database...').start();
      const result = importer.importFoods(totalFoods);
      importSpinner.succeed(`Imported ${result.imported} SR Legacy foods (${result.skipped} skipped)`);
    }

  } catch (error: any) {
    console.log(chalk.yellow('\n⚠️  Could not download USDA data: ' + error.message));
    console.log(chalk.cyan('\nFalling back to sample dataset...\n'));
    importer.createSampleDataset();
  }

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
