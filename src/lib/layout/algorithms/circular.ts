import type { Table, Relationship } from '@/types/schema';
import type { LayoutOptions, GraphNode } from '../types';
import { GAP_X, getDim } from '../constants';
import { computeRingRadius, removeOverlaps } from '../utils';

const ASPECT = 0.75; // ellipse Y/X ratio for screen-friendly proportions

/**
 * Circular (Hub-and-Spoke) Layout.
 *
 * Algorithm:
 * 1. Sort all tables by degree (connections). Highly connected tables = hubs.
 * 2. Top 10 % of tables are "hubs" — placed on a small inner ring (or centred
 *    when there is only one hub).
 * 3. Remaining tables are "peripherals" — placed on an outer ellipse whose
 *    radius is computed from the sum of actual node widths so they can't overlap.
 * 4. Each ring gets a final `removeOverlaps` pass for safety.
 */
export function circularLayout(
  tables: Table[],
  relationships: Relationship[],
  opts: LayoutOptions
): Table[] {
  if (!tables.length) return [];

  // ── Degree centrality ───────────────────────────────────────────────────
  const deg = new Map<string, number>(tables.map(t => [t.id, 0]));
  for (const r of relationships) {
    deg.set(r.sourceTableId, (deg.get(r.sourceTableId) ?? 0) + 1);
    deg.set(r.targetTableId, (deg.get(r.targetTableId) ?? 0) + 1);
  }

  const sorted      = [...tables].sort((a, b) => (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0));
  const hubCount    = Math.max(1, Math.round(tables.length * 0.1));
  const hubs        = sorted.slice(0, hubCount);
  const peripherals = sorted.slice(hubCount);

  const mkNode = (t: Table): GraphNode => ({
    id: t.id, table: t, x: 0, y: 0, vx: 0, vy: 0, ...getDim(t, opts.nodeSizes),
  });

  const hubNodes  = hubs.map(mkNode);
  const periNodes = peripherals.map(mkNode);

  const cx = opts.centerOffset.x;
  const cy = opts.centerOffset.y;

  // ── Inner ring (hubs) ───────────────────────────────────────────────────
  if (hubNodes.length === 1) {
    // Single hub sits at the centre
    hubNodes[0].x = cx;
    hubNodes[0].y = cy;
  } else {
    const innerR = computeRingRadius(hubNodes, GAP_X, 1.0);
    hubNodes.forEach((nd, i) => {
      const angle = (2 * Math.PI * i) / hubNodes.length - Math.PI / 2;
      nd.x = cx + innerR * Math.cos(angle);
      nd.y = cy + innerR * Math.sin(angle);
    });
    removeOverlaps(hubNodes, GAP_X);
  }

  // ── Outer ellipse (peripherals) ─────────────────────────────────────────
  if (periNodes.length) {
    // The outer ring must clear the hub cluster + half the largest peripheral
    const hubOuterR = hubNodes.length > 1
      ? Math.max(...hubNodes.map(nd => Math.sqrt((nd.x - cx) ** 2 + (nd.y - cy) ** 2)))
      : Math.max(...hubNodes.map(nd => Math.max(nd.width, nd.height) / 2));

    const minR  = hubOuterR
      + Math.max(...periNodes.map(nd => Math.max(nd.width, nd.height) / 2))
      + GAP_X * 2;
    const ringR = Math.max(computeRingRadius(periNodes, GAP_X, ASPECT), minR);

    periNodes.forEach((nd, i) => {
      const angle = (2 * Math.PI * i) / periNodes.length - Math.PI / 2;
      nd.x = cx + ringR * Math.cos(angle);
      nd.y = cy + ringR * ASPECT * Math.sin(angle);
    });
    removeOverlaps(periNodes, GAP_X);
  }

  return [...hubNodes, ...periNodes].map(nd => ({
    ...nd.table,
    position: { x: Math.round(nd.x), y: Math.round(nd.y) },
  }));
}
