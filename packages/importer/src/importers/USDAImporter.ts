import Database from 'better-sqlite3';
import { USDAFood } from '../parsers/USDAParser';

export class USDAImporter {
  constructor(private db: Database.Database) {}

  /**
   * Import foods and nutrients into database
   */
  importFoods(foods: USDAFood[]): { imported: number; skipped: number } {
    let imported = 0;
    let skipped = 0;

    const insertFood = this.db.prepare(`
      INSERT OR IGNORE INTO foods (fdc_id, description, data_type, brand_owner, search_vector)
      VALUES (?, ?, ?, ?, ?)
    `);

    const insertNutrient = this.db.prepare(`
      INSERT OR IGNORE INTO nutrients (nutrient_id, name, unit_name, nutrient_number)
      VALUES (?, ?, ?, ?)
    `);

    const insertFoodNutrient = this.db.prepare(`
      INSERT OR IGNORE INTO food_nutrients (food_id, nutrient_id, amount)
      VALUES (?, ?, ?)
    `);

    const getFoodId = this.db.prepare(`
      SELECT id FROM foods WHERE fdc_id = ?
    `);

    const getNutrientId = this.db.prepare(`
      SELECT id FROM nutrients WHERE nutrient_id = ?
    `);

    // Use transaction for better performance
    const importTransaction = this.db.transaction((foods: USDAFood[]) => {
      for (const food of foods) {
        try {
          // Create search vector (lowercase description for searching)
          const searchVector = food.description.toLowerCase();

          // Insert food
          const result = insertFood.run(
            food.fdcId,
            food.description,
            food.dataType,
            food.brandOwner || null,
            searchVector
          );

          if (result.changes === 0) {
            skipped++;
            continue;
          }

          // Get food ID
          const foodRow = getFoodId.get(food.fdcId) as any;
          if (!foodRow) continue;

          const foodId = foodRow.id;

          // Insert nutrients and food-nutrient relationships
          for (const fn of food.foodNutrients) {
            // Insert nutrient if not exists
            insertNutrient.run(
              fn.nutrient.id,
              fn.nutrient.name,
              fn.nutrient.unitName,
              fn.nutrient.number || null
            );

            // Get nutrient ID
            const nutrientRow = getNutrientId.get(fn.nutrient.id) as any;
            if (!nutrientRow) continue;

            const nutrientId = nutrientRow.id;

            // Insert food-nutrient relationship
            insertFoodNutrient.run(foodId, nutrientId, fn.amount);
          }

          imported++;
        } catch (error: any) {
          console.error(`Error importing food ${food.fdcId}: ${error.message}`);
          skipped++;
        }
      }
    });

    importTransaction(foods);

    return { imported, skipped };
  }

  /**
   * Get import statistics
   */
  getStatistics(): {
    totalFoods: number;
    totalNutrients: number;
    foodsByType: Record<string, number>;
  } {
    const totalFoods = (this.db.prepare('SELECT COUNT(*) as count FROM foods').get() as any).count;
    const totalNutrients = (this.db.prepare('SELECT COUNT(*) as count FROM nutrients').get() as any).count;

    const foodsByTypeRows = this.db.prepare(`
      SELECT data_type, COUNT(*) as count
      FROM foods
      GROUP BY data_type
    `).all() as Array<{ data_type: string; count: number }>;

    const foodsByType: Record<string, number> = {};
    for (const row of foodsByTypeRows) {
      foodsByType[row.data_type] = row.count;
    }

    return {
      totalFoods,
      totalNutrients,
      foodsByType
    };
  }

  /**
   * Create a sample dataset for testing
   */
  createSampleDataset(): void {
    console.log('Creating sample dataset...');

    const sampleFoods: USDAFood[] = [
      {
        fdcId: 1,
        description: 'Chicken, breast, meat only, raw',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 120 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 22.5 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 2.6 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0 },
        ]
      },
      {
        fdcId: 2,
        description: 'Rice, white, long-grain, regular, raw',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 365 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 7.1 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 0.6 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 80 },
        ]
      },
      {
        fdcId: 3,
        description: 'Broccoli, raw',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 34 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 2.8 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 0.4 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 7 },
          { nutrient: { id: 1162, name: 'Vitamin C, total ascorbic acid', unitName: 'mg' }, amount: 89.2 },
        ]
      },
      {
        fdcId: 4,
        description: 'Egg, whole, raw',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 143 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 12.6 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 9.5 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0.7 },
        ]
      },
      {
        fdcId: 5,
        description: 'Salmon, Atlantic, raw',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 142 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 19.8 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 6.3 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 0 },
        ]
      },
      {
        fdcId: 6,
        description: 'Apple, raw, with skin',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 52 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 0.3 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 0.2 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 14 },
        ]
      },
      {
        fdcId: 7,
        description: 'Milk, whole, 3.25% milkfat',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 61 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 3.2 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 3.3 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 4.8 },
        ]
      },
      {
        fdcId: 8,
        description: 'Bread, whole-wheat, commercially prepared',
        dataType: 'SR Legacy',
        foodNutrients: [
          { nutrient: { id: 1008, name: 'Energy', unitName: 'kcal' }, amount: 247 },
          { nutrient: { id: 1003, name: 'Protein', unitName: 'g' }, amount: 13 },
          { nutrient: { id: 1004, name: 'Total lipid (fat)', unitName: 'g' }, amount: 3.4 },
          { nutrient: { id: 1005, name: 'Carbohydrate, by difference', unitName: 'g' }, amount: 41 },
        ]
      },
    ];

    const result = this.importFoods(sampleFoods);
    console.log(`Sample dataset created: ${result.imported} foods imported`);
  }
}
