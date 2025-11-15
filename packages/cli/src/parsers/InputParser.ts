export interface ParsedInput {
  quantity: number;
  unit: string;
  foodName: string;
}

export interface ParseError {
  message: string;
  position: number;
  input: string;
}

export class InputParser {
  private static readonly UNIT_CONVERSIONS: Record<string, number> = {
    // Metric
    'g': 1,
    'gram': 1,
    'grams': 1,
    'kg': 1000,
    'kilogram': 1000,
    'kilograms': 1000,
    'mg': 0.001,
    'milligram': 0.001,
    'milligrams': 0.001,

    // Imperial
    'oz': 28.3495,
    'ounce': 28.3495,
    'ounces': 28.3495,
    'lb': 453.592,
    'lbs': 453.592,
    'pound': 453.592,
    'pounds': 453.592,

    // Volume (approximate conversions assuming water density)
    'ml': 1,
    'milliliter': 1,
    'milliliters': 1,
    'l': 1000,
    'liter': 1000,
    'liters': 1000,
    'cup': 236.588,
    'cups': 236.588,
    'tbsp': 14.7868,
    'tablespoon': 14.7868,
    'tablespoons': 14.7868,
    'tsp': 4.92892,
    'teaspoon': 4.92892,
    'teaspoons': 4.92892,

    // Special units
    'serving': 1, // Will be handled specially
    'servings': 1,
  };

  /**
   * Parse input in the format: "quantity unit food_name"
   * Example: "200g chicken breast"
   */
  static parse(input: string): ParsedInput | ParseError {
    const trimmed = input.trim();

    if (!trimmed) {
      return {
        message: 'Input cannot be empty',
        position: 0,
        input
      };
    }

    // Regex to match: number (with optional decimal) + optional whitespace + unit + whitespace + food name
    const pattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)\s+(.+)$/;
    const match = trimmed.match(pattern);

    if (!match) {
      // Try to provide helpful error messages
      const numberPattern = /^(\d+(?:\.\d+)?)/;
      const numberMatch = trimmed.match(numberPattern);

      if (!numberMatch) {
        return {
          message: 'Input must start with a quantity (number)',
          position: 0,
          input
        };
      }

      const afterNumber = trimmed.substring(numberMatch[0].length).trim();
      const unitPattern = /^([a-zA-Z]+)/;
      const unitMatch = afterNumber.match(unitPattern);

      if (!unitMatch) {
        return {
          message: 'Missing unit after quantity',
          position: numberMatch[0].length,
          input
        };
      }

      // Must be missing food name
      return {
        message: 'Missing food name',
        position: trimmed.length,
        input
      };
    }

    const [, quantityStr, unit, foodName] = match;
    const quantity = parseFloat(quantityStr);

    // Validate unit
    if (!this.UNIT_CONVERSIONS[unit.toLowerCase()]) {
      const unitPosition = trimmed.indexOf(unit);
      return {
        message: `Unknown unit "${unit}". Valid units: g, kg, oz, lb, cup, tbsp, tsp, ml, l, serving`,
        position: unitPosition,
        input
      };
    }

    return {
      quantity,
      unit: unit.toLowerCase(),
      foodName: foodName.trim()
    };
  }

  /**
   * Convert quantity to grams
   */
  static convertToGrams(quantity: number, unit: string): number {
    const conversionFactor = this.UNIT_CONVERSIONS[unit.toLowerCase()];
    if (!conversionFactor) {
      throw new Error(`Unknown unit: ${unit}`);
    }
    return quantity * conversionFactor;
  }

  /**
   * Check if unit is a serving unit
   */
  static isServingUnit(unit: string): boolean {
    return unit.toLowerCase() === 'serving' || unit.toLowerCase() === 'servings';
  }

  /**
   * Format error message with position indicator
   */
  static formatError(error: ParseError): string {
    const lines: string[] = [];
    lines.push(error.input);

    // Add position indicator
    const indicator = ' '.repeat(error.position) + '^';
    lines.push(indicator);
    lines.push(error.message);

    return lines.join('\n');
  }
}
