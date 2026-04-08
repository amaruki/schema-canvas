import type { Table, Relationship } from '@/types/schema';
import type { LayoutOptions } from './types';
export type { LayoutOptions } from './types';
import {
  gridLayout,
  hierarchicalLayout,
  forceDirectedLayout,
  circularLayout,
  warehouseLayout,
} from './algorithms';

/**
 * AutoLayout — thin dispatcher that delegates to the appropriate algorithm.
 *
 * Import this class (or the top-level `index.ts`) to run layouts:
 * ```ts
 * import { AutoLayout } from '@/lib/layout';
 * const positioned = AutoLayout.layoutTables(tables, relationships, { algorithm: 'grid' });
 * ```
 */
export class AutoLayout {
  private static readonly DEFAULT_OPTIONS: LayoutOptions = {
    algorithm:    'force-directed',
    spacing:      { x: 350, y: 280 },
    centerOffset: { x: 400, y: 300 },
    iterations:   300,
  };

  // ── Layout dispatcher ────────────────────────────────────────────────────
  static layoutTables(
    tables: Table[],
    relationships: Relationship[],
    options: Partial<LayoutOptions> = {}
  ): Table[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    switch (opts.algorithm) {
      case 'grid':           return gridLayout(tables, opts);
      case 'hierarchical':   return hierarchicalLayout(tables, relationships, opts);
      case 'force-directed': return forceDirectedLayout(tables, relationships, opts);
      case 'circular':       return circularLayout(tables, relationships, opts);
      case 'warehouse':      return warehouseLayout(tables, relationships, opts);
      default:               return forceDirectedLayout(tables, relationships, opts);
    }
  }

  // ── Algorithm recommendation ─────────────────────────────────────────────
  /**
   * Heuristic that picks the best algorithm based on schema size and density.
   *
   * | Condition                         | Suggested algorithm |
   * |-----------------------------------|---------------------|
   * | > 10 tables, density > 0.08       | warehouse           |
   * | density > 0.3                     | circular            |
   * | density > 0.05                    | hierarchical        |
   * | otherwise                         | force-directed      |
   */
  static recommendLayout(
    tables: Table[],
    relationships: Relationship[]
  ): LayoutOptions['algorithm'] {
    const n = tables.length;
    if (n <= 2) return 'force-directed';

    const density = relationships.length / ((n * (n - 1)) / 2 || 1);

    if (n > 10 && density > 0.08) return 'warehouse';
    if (density > 0.3)            return 'circular';
    if (density > 0.05)           return 'hierarchical';
    return 'force-directed';
  }
}