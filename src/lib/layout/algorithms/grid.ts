import type { Table } from '@/types/schema';
import type { LayoutOptions } from '../types';
import { GAP_X, GAP_Y, getDim } from '../constants';

/**
 * Grid Layout — sorts tables alphabetically, then packs them into a square
 * grid. Each column is sized to the widest table in that column; each row is
 * sized to the tallest table in that row. No overlap is possible by construction.
 */
export function gridLayout(tables: Table[], opts: LayoutOptions): Table[] {
  if (!tables.length) return [];

  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const cols   = Math.ceil(Math.sqrt(sorted.length));
  const dims   = sorted.map(t => getDim(t, opts.nodeSizes));

  // Per-column max width & per-row max height
  const colW: number[] = new Array(cols).fill(0);
  const rowH: number[] = [];

  dims.forEach((d, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    colW[col] = Math.max(colW[col], d.width);
    rowH[row] = Math.max(rowH[row] ?? 0, d.height);
  });

  // Cumulative x-offset per column
  const colX: number[] = [];
  let curX = opts.centerOffset.x;
  for (let c = 0; c < cols; c++) {
    colX.push(curX);
    curX += colW[c] + GAP_X;
  }

  // Cumulative y-offset per row
  const rowY: number[] = [];
  let curY = opts.centerOffset.y;
  for (let r = 0; r < rowH.length; r++) {
    rowY.push(curY);
    curY += rowH[r] + GAP_Y;
  }

  return sorted.map((t, i) => ({
    ...t,
    position: { x: colX[i % cols], y: rowY[Math.floor(i / cols)] },
  }));
}
