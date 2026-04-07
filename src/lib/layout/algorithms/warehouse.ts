import type { Table, Relationship } from '@/types/schema';
import type { LayoutOptions, GraphNode } from '../types';
import {
  MIN_TABLE_WIDTH,
  HEADER_HEIGHT,
  COLUMN_HEIGHT,
  GAP_X,
  GAP_Y,
  getDim,
} from '../constants';
import { computeRingRadius, removeOverlaps } from '../utils';

/**
 * Data-Warehouse Layout — optimised for Star and Snowflake schemas.
 *
 * Algorithm:
 * 1. Rank tables by total neighbours. Top 15 % become "facts" (high-connectivity hubs).
 * 2. Facts are placed in a grid whose cell spacing is generous enough to
 *    accommodate a full ring of dimension tables around each fact.
 * 3. For each fact, its directly connected dimension tables are placed on a
 *    circular ring whose radius is derived from the actual sizes of those nodes.
 * 4. Each local star cluster gets an `removeOverlaps` pass.
 * 5. Orphan tables (not connected to any fact) are stacked on the left.
 */
export function warehouseLayout(
  tables: Table[],
  relationships: Relationship[],
  opts: LayoutOptions
): Table[] {
  if (!tables.length) return [];

  // ── Build adjacency sets ────────────────────────────────────────────────
  const adj = new Map<string, Set<string>>(tables.map(t => [t.id, new Set()]));
  for (const r of relationships) {
    adj.get(r.sourceTableId)?.add(r.targetTableId);
    adj.get(r.targetTableId)?.add(r.sourceTableId);
  }

  // ── Facts vs dimensions ─────────────────────────────────────────────────
  const sorted    = [...tables].sort((a, b) => (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0));
  const factCount = Math.max(1, Math.ceil(tables.length * 0.15));
  const facts     = sorted.slice(0, factCount);
  const dimTables = sorted.slice(factCount);

  const placedIds  = new Set<string>();
  const allNodes: GraphNode[] = [];

  const mkNode = (t: Table, x = 0, y = 0): GraphNode => ({
    id: t.id, table: t, x, y, vx: 0, vy: 0, ...getDim(t, opts.nodeSizes),
  });

  // ── Estimate fact-cell size for grid layout ─────────────────────────────
  // Generous upper bound: assume up to 8 dimension nodes on the ring
  const MAX_DIM_ESTIMATE  = 8;
  const AVG_DIM_WIDTH     = MIN_TABLE_WIDTH + GAP_X * 2;
  const estRingRadius     = (MAX_DIM_ESTIMATE * AVG_DIM_WIDTH) / (2 * Math.PI) + GAP_X;
  const factCols          = Math.ceil(Math.sqrt(facts.length));
  const factSpacingX      = estRingRadius * 2 + MIN_TABLE_WIDTH + GAP_X * 4;
  const factSpacingY      = estRingRadius * 2 + (HEADER_HEIGHT + 6 * COLUMN_HEIGHT) + GAP_Y * 4;

  // ── Place each fact + its dimension ring ────────────────────────────────
  facts.forEach((fact, fi) => {
    const col = fi % factCols;
    const row = Math.floor(fi / factCols);
    const fx  = opts.centerOffset.x + col * factSpacingX;
    const fy  = opts.centerOffset.y + row * factSpacingY;

    const fNode = mkNode(fact, fx, fy);
    allNodes.push(fNode);
    placedIds.add(fact.id);

    // Dimensions directly connected to this fact (first-come basis for multi-fact)
    const connected = dimTables.filter(
      d => !placedIds.has(d.id) &&
           (adj.get(fact.id)?.has(d.id) || adj.get(d.id)?.has(fact.id))
    );
    if (!connected.length) return;

    const dimNodes = connected.map(d => mkNode(d));

    // Ring radius derived from actual node sizes
    const fDim       = getDim(fact, opts.nodeSizes);
    const factHalf   = Math.max(fDim.width, fDim.height) / 2;
    const maxDimHalf = Math.max(...dimNodes.map(nd => Math.max(nd.width, nd.height) / 2));
    const ringR = Math.max(
      computeRingRadius(dimNodes, GAP_X, 1.0),
      factHalf + maxDimHalf + GAP_X * 2
    );

    dimNodes.forEach((nd, di) => {
      const angle = (2 * Math.PI * di) / connected.length - Math.PI / 2;
      nd.x = fx + ringR * Math.cos(angle);
      nd.y = fy + ringR * Math.sin(angle) * 0.85;
      placedIds.add(nd.id);
    });

    // Local overlap resolution for this star cluster
    removeOverlaps([fNode, ...dimNodes], GAP_X);
    allNodes.push(...dimNodes);
  });

  // ── Orphan tables (no relationship with any fact) ───────────────────────
  const orphans = tables.filter(t => !placedIds.has(t.id));
  let orphanY = opts.centerOffset.y;
  for (const o of orphans) {
    const dim = getDim(o, opts.nodeSizes);
    allNodes.push(mkNode(o, opts.centerOffset.x - factSpacingX * 0.6, orphanY));
    orphanY += dim.height + GAP_Y;
  }

  return allNodes.map(nd => ({
    ...nd.table,
    position: { x: Math.round(nd.x), y: Math.round(nd.y) },
  }));
}
