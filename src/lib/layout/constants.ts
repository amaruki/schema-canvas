import type { Table } from '@/types/schema';
import type { LayoutOptions } from './types';

// ─── Node size constants matching TableNode.tsx ────────────────────────────────
export const MIN_TABLE_WIDTH = 260;
export const HEADER_HEIGHT   = 42;
export const COLUMN_HEIGHT   = 36;
export const ADD_BTN_HEIGHT  = 34;
export const TABLE_PADDING   = 10;

/** Minimum gap between node bounding boxes */
export const GAP_X = 80;
export const GAP_Y = 80;

/**
 * Return the bounding-box dimensions for a table.
 * Uses `nodeSizes` override when provided (e.g. measured DOM dimensions).
 */
export function getDim(
  table: Table,
  nodeSizes?: LayoutOptions['nodeSizes']
): { width: number; height: number } {
  if (nodeSizes?.has(table.id)) return nodeSizes.get(table.id)!;
  return {
    width:  MIN_TABLE_WIDTH,
    height:
      HEADER_HEIGHT +
      table.columns.length * COLUMN_HEIGHT +
      ADD_BTN_HEIGHT +
      TABLE_PADDING,
  };
}
