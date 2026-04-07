import type { Table, Relationship } from '@/types/schema';
import type { LayoutOptions, GraphNode } from '../types';
import { MIN_TABLE_WIDTH, HEADER_HEIGHT, COLUMN_HEIGHT, GAP_X, GAP_Y, getDim } from '../constants';
import { removeOverlaps } from '../utils';

/**
 * Force-Directed Layout (Fruchterman–Reingold variant) with size-aware physics.
 *
 * Improvements over classic F-R:
 * - Deterministic initial grid placement (no Math.random)
 * - Spring constant `k` derived from average node bounding-box diagonal
 * - Bounding-box repulsion with 8× boost when nodes actually overlap
 * - Weak centre-gravity force keeps the layout compact
 * - Final `removeOverlaps` pass guarantees zero residual collisions
 */
export function forceDirectedLayout(
  tables: Table[],
  relationships: Relationship[],
  opts: LayoutOptions
): Table[] {
  const n = tables.length;
  if (!n) return [];

  // ── Initialise nodes on a deterministic grid ────────────────────────────
  const cols = Math.ceil(Math.sqrt(n));
  const nodes: GraphNode[] = tables.map((t, i) => {
    const dim = getDim(t, opts.nodeSizes);
    return {
      id: t.id, table: t,
      x:  opts.centerOffset.x + (i % cols)          * (MIN_TABLE_WIDTH + GAP_X * 3),
      y:  opts.centerOffset.y + Math.floor(i / cols) * (HEADER_HEIGHT + 8 * COLUMN_HEIGHT + GAP_Y * 3),
      vx: 0, vy: 0,
      width:  dim.width,
      height: dim.height,
    };
  });

  // ── Spring constant: average bounding-box diagonal + gap ────────────────
  const avgW = nodes.reduce((s, nd) => s + nd.width,  0) / n;
  const avgH = nodes.reduce((s, nd) => s + nd.height, 0) / n;
  const k    = Math.sqrt(avgW * avgH) + GAP_X;
  const T0   = k * 2;
  const iters = opts.iterations ?? 300;

  // Index for O(1) edge-lookup
  const nodeIdx = new Map(nodes.map(nd => [nd.id, nd]));

  // ── Simulation ──────────────────────────────────────────────────────────
  for (let iter = 0; iter < iters; iter++) {
    const temp = T0 * (1 - iter / iters);

    // Repulsion — bounding-box aware, boosted when overlapping
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        const u = nodes[i], v = nodes[j];
        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const dist  = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const safeX = (u.width  + v.width)  / 2 + GAP_X;
        const safeY = (u.height + v.height) / 2 + GAP_Y;
        const overlap = Math.abs(dx) < safeX && Math.abs(dy) < safeY;
        const r = (k * k) / dist * (overlap ? 8 : 1);

        u.vx += (dx / dist) * r;  u.vy += (dy / dist) * r;
        v.vx -= (dx / dist) * r;  v.vy -= (dy / dist) * r;
      }
    }

    // Attraction along edges
    for (const rel of relationships) {
      const u = nodeIdx.get(rel.sourceTableId);
      const v = nodeIdx.get(rel.targetTableId);
      if (!u || !v) continue;
      const dx   = u.x - v.x;
      const dy   = u.y - v.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const a    = (dist * dist) / k;

      u.vx -= (dx / dist) * a;  u.vy -= (dy / dist) * a;
      v.vx += (dx / dist) * a;  v.vy += (dy / dist) * a;
    }

    // Weak gravity toward centre
    for (const nd of nodes) {
      nd.vx += (opts.centerOffset.x - nd.x) * 0.02;
      nd.vy += (opts.centerOffset.y - nd.y) * 0.02;
    }

    // Apply velocities with temperature cap
    for (const nd of nodes) {
      const spd = Math.sqrt(nd.vx * nd.vx + nd.vy * nd.vy) || 0.01;
      const lim = Math.min(spd, temp);
      nd.x += (nd.vx / spd) * lim;
      nd.y += (nd.vy / spd) * lim;
      nd.vx = 0; nd.vy = 0;
    }
  }

  // ── Guaranteed overlap removal ──────────────────────────────────────────
  removeOverlaps(nodes, GAP_X);

  return nodes.map(nd => ({
    ...nd.table,
    position: { x: Math.round(nd.x), y: Math.round(nd.y) },
  }));
}
