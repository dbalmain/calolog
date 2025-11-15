import * as fs from 'fs';
import * as path from 'path';

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  foodNutrients: Array<{
    nutrient: {
      id: number;
      name: string;
      unitName: string;
      number?: string;
    };
    amount: number;
  }>;
}

export class USDAParser {
  /**
   * Parse USDA JSON file
   */
  parseJSONFile(filepath: string): USDAFood[] {
    if (!fs.existsSync(filepath)) {
      throw new Error(`File not found: ${filepath}`);
    }

    const content = fs.readFileSync(filepath, 'utf-8');
    const data = JSON.parse(content);

    // The structure varies by dataset type
    // This is a simplified parser that handles the common structure
    if (Array.isArray(data)) {
      return data.map(this.parseFoodItem.bind(this));
    } else if (data.FoundationFoods) {
      return data.FoundationFoods.map(this.parseFoodItem.bind(this));
    } else if (data.SRLegacyFoods) {
      return data.SRLegacyFoods.map(this.parseFoodItem.bind(this));
    } else if (data.BrandedFoods) {
      return data.BrandedFoods.map(this.parseFoodItem.bind(this));
    }

    return [];
  }

  private parseFoodItem(item: any): USDAFood {
    return {
      fdcId: item.fdcId,
      description: item.description,
      dataType: item.dataType,
      brandOwner: item.brandOwner,
      foodNutrients: (item.foodNutrients || []).map((fn: any) => ({
        nutrient: {
          id: fn.nutrient?.id || fn.nutrientId,
          name: fn.nutrient?.name || fn.nutrientName,
          unitName: fn.nutrient?.unitName || fn.unitName || 'g',
          number: fn.nutrient?.number || fn.nutrientNumber
        },
        amount: fn.amount || 0
      }))
    };
  }

  /**
   * Find all JSON files in a directory
   */
  findJSONFiles(directory: string): string[] {
    if (!fs.existsSync(directory)) {
      return [];
    }

    const files: string[] = [];
    const entries = fs.readdirSync(directory, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        files.push(...this.findJSONFiles(fullPath));
      } else if (entry.isFile() && entry.name.endsWith('.json')) {
        files.push(fullPath);
      }
    }

    return files;
  }
}
