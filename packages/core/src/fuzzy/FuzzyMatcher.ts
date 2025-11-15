import Database from 'better-sqlite3';
import { Food } from '../models/Food';

export interface FuzzyMatch {
  food: Food;
  score: number;
  isLearned: boolean;
}

export class FuzzyMatcher {
  constructor(private db: Database.Database) {}

  /**
   * Calculate Levenshtein distance between two strings
   */
  private levenshteinDistance(str1: string, str2: string): number {
    const m = str1.length;
    const n = str2.length;
    const dp: number[][] = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (str1[i - 1] === str2[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
        }
      }
    }

    return dp[m][n];
  }

  /**
   * Calculate similarity score (0-1, higher is better)
   */
  private similarity(str1: string, str2: string): number {
    const maxLen = Math.max(str1.length, str2.length);
    if (maxLen === 0) return 1.0;

    const distance = this.levenshteinDistance(str1.toLowerCase(), str2.toLowerCase());
    return 1 - distance / maxLen;
  }

  /**
   * Calculate trigram similarity
   */
  private trigrams(str: string): Set<string> {
    const s = `  ${str.toLowerCase()}  `;
    const trigrams = new Set<string>();

    for (let i = 0; i < s.length - 2; i++) {
      trigrams.add(s.substring(i, i + 3));
    }

    return trigrams;
  }

  private trigramSimilarity(str1: string, str2: string): number {
    const trigrams1 = this.trigrams(str1);
    const trigrams2 = this.trigrams(str2);

    const intersection = new Set([...trigrams1].filter(x => trigrams2.has(x)));
    const union = new Set([...trigrams1, ...trigrams2]);

    return union.size === 0 ? 0 : intersection.size / union.size;
  }

  /**
   * Search for foods with fuzzy matching
   */
  search(query: string, limit: number = 10, threshold: number = 0.3): FuzzyMatch[] {
    // First check for learned selection
    const learned = this.db.prepare(`
      SELECT selected_food_id as food_id, selected_food_type as food_type, selection_count
      FROM user_selections
      WHERE LOWER(query) = LOWER(?)
      ORDER BY selection_count DESC
      LIMIT 1
    `).get(query) as any;

    // Get candidate foods (broader search)
    const words = query.toLowerCase().split(/\s+/);
    const searchConditions = words.map(() => 'LOWER(description) LIKE ?').join(' AND ');
    const searchParams = words.map(w => `%${w}%`);

    const candidates = this.db.prepare(`
      SELECT * FROM foods
      WHERE ${searchConditions}
      LIMIT 100
    `).all(...searchParams) as Food[];

    // Calculate scores
    const matches: FuzzyMatch[] = candidates.map(food => {
      // Use both Levenshtein and trigram similarity
      const levenScore = this.similarity(query, food.description);
      const trigramScore = this.trigramSimilarity(query, food.description);

      // Weighted average (trigram similarity is generally better for longer strings)
      const score = (levenScore * 0.4 + trigramScore * 0.6);

      // Boost score if it's a learned selection
      const isLearned = learned && learned.food_id === food.id;
      const finalScore = isLearned ? Math.min(score * 1.5, 1.0) : score;

      return {
        food,
        score: finalScore,
        isLearned
      };
    });

    // Filter by threshold, sort by score, and limit results
    return matches
      .filter(m => m.score >= threshold)
      .sort((a, b) => {
        // Prioritize learned selections
        if (a.isLearned && !b.isLearned) return -1;
        if (!a.isLearned && b.isLearned) return 1;
        // Then sort by score
        return b.score - a.score;
      })
      .slice(0, limit);
  }

  /**
   * Find exact match
   */
  exactMatch(query: string): Food | null {
    const stmt = this.db.prepare(`
      SELECT * FROM foods
      WHERE LOWER(description) = LOWER(?)
      LIMIT 1
    `);

    return (stmt.get(query) as Food) || null;
  }
}
