import Database from 'better-sqlite3';
import { Entry, CreateEntryInput } from '../models/Entry';

export class EntryService {
  constructor(private db: Database.Database) {}

  createEntry(input: CreateEntryInput): Entry {
    const date = input.date || new Date().toISOString().split('T')[0];
    const time = input.time || new Date().toISOString().split('T')[1].split('.')[0];

    const stmt = this.db.prepare(`
      INSERT INTO entries (date, time, meal_type, food_id, food_type, amount_grams, servings, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      date,
      time,
      input.meal_type || null,
      input.food_id,
      input.food_type,
      input.amount_grams || null,
      input.servings || null,
      input.notes || null
    );

    return this.getEntryById(result.lastInsertRowid as number)!;
  }

  getEntryById(id: number): Entry | undefined {
    const stmt = this.db.prepare('SELECT * FROM entries WHERE id = ?');
    return stmt.get(id) as Entry | undefined;
  }

  getEntriesByDate(date: string): Entry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entries
      WHERE date = ?
      ORDER BY time
    `);
    return stmt.all(date) as Entry[];
  }

  getEntriesByDateRange(startDate: string, endDate: string): Entry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entries
      WHERE date >= ? AND date <= ?
      ORDER BY date, time
    `);
    return stmt.all(startDate, endDate) as Entry[];
  }

  getEntriesByMeal(date: string, mealType: string): Entry[] {
    const stmt = this.db.prepare(`
      SELECT * FROM entries
      WHERE date = ? AND meal_type = ?
      ORDER BY time
    `);
    return stmt.all(date, mealType) as Entry[];
  }

  deleteEntry(id: number): boolean {
    const stmt = this.db.prepare('DELETE FROM entries WHERE id = ?');
    const result = stmt.run(id);
    return result.changes > 0;
  }

  updateEntry(id: number, updates: Partial<CreateEntryInput>): Entry | undefined {
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.date !== undefined) {
      fields.push('date = ?');
      values.push(updates.date);
    }
    if (updates.time !== undefined) {
      fields.push('time = ?');
      values.push(updates.time);
    }
    if (updates.meal_type !== undefined) {
      fields.push('meal_type = ?');
      values.push(updates.meal_type);
    }
    if (updates.amount_grams !== undefined) {
      fields.push('amount_grams = ?');
      values.push(updates.amount_grams);
    }
    if (updates.servings !== undefined) {
      fields.push('servings = ?');
      values.push(updates.servings);
    }
    if (updates.notes !== undefined) {
      fields.push('notes = ?');
      values.push(updates.notes);
    }

    if (fields.length === 0) {
      return this.getEntryById(id);
    }

    values.push(id);
    const stmt = this.db.prepare(`
      UPDATE entries
      SET ${fields.join(', ')}
      WHERE id = ?
    `);

    stmt.run(...values);
    return this.getEntryById(id);
  }
}
