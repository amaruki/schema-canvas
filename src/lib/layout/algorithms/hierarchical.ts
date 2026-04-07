import type { Table, Relationship } from '@/types/schema';
import type { LayoutOptions } from '../types';
import { GAP_X, GAP_Y, getDim } from '../constants';

/**
 * Hierarchical (Tree) Layout — performs a topological BFS to assign each table
 * a level, then positions levels top-to-bottom with dynamic vertical spacing
 * (max node height in that level) and centres each level horizontally using
 * actual node widths.
 */
export function hierarchicalLayout(
  tables: Table[],
  relationships: Relationship[],
  opts: LayoutOptions
): Table[] {
  if (!tables.length) return [];

  // ── Build adjacency + in-degree ──────────────────────────────────────────
  const children = new Map<string, string[]>();
  const inDeg    = new Map<string, number>();

  tables.forEach(t => { children.set(t.id, []); inDeg.set(t.id, 0); });
  relationships.forEach(r => {
    children.get(r.sourceTableId)?.push(r.targetTableId);
    inDeg.set(r.targetTableId, (inDeg.get(r.targetTableId) ?? 0) + 1);
  });

  // ── Topological BFS → levels ──────────────────────────────────────────────
  const levels: string[][] = [];
  const visited = new Set<string>();

  let queue = tables.filter(t => !inDeg.get(t.id)).map(t => t.id);
  // Handle pure cycles or fully disconnected graphs
  if (!queue.length && tables.length) queue = [tables[0].id];

  while (queue.length) {
    levels.push([...queue]);
    const next: string[] = [];

    for (const id of queue) {
      visited.add(id);
      for (const cid of children.get(id) ?? []) {
        if (!visited.has(cid)) {
          const d = (inDeg.get(cid) ?? 1) - 1;
          inDeg.set(cid, d);
          if (d <= 0) next.push(cid);
        }
      }
    }

    queue = next;
    if (levels.length > tables.length) break; // cycle safety
  }

  // Unvisited nodes (cycles) go into a final level
  const remaining = tables.filter(t => !visited.has(t.id)).map(t => t.id);
  if (remaining.length) levels.push(remaining);

  // ── Position tables level-by-level ───────────────────────────────────────
  const tMap   = new Map(tables.map(t => [t.id, t]));
  const result: Table[] = [];
  let curY = opts.centerOffset.y;

  for (const level of levels) {
    const lds    = level.map(id => getDim(tMap.get(id)!, opts.nodeSizes));
    const maxH   = Math.max(...lds.map(d => d.height));
    const totalW = lds.reduce((s, d) => s + d.width, 0) + GAP_X * (level.length - 1);
    let curX     = opts.centerOffset.x - totalW / 2;

    for (let i = 0; i < level.length; i++) {
      result.push({ ...tMap.get(level[i])!, position: { x: curX, y: curY } });
      curX += lds[i].width + GAP_X;
    }

    curY += maxH + GAP_Y;
  }

  return result;
}
