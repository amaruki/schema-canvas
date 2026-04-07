import { Table, Relationship } from '@/types/schema';

export interface LayoutOptions {
  algorithm: 'grid' | 'hierarchical' | 'force-directed' | 'circular' | 'warehouse';
  spacing: { x: number; y: number };
  centerOffset: { x: number; y: number };
  iterations?: number;
  nodeSizes?: Map<string, { width: number; height: number }>;
}

export interface GraphNode {
  id: string;
  table: Table;
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: Relationship;
}

// ─── Constants matching TableNode.tsx ─────────────────────────────────────────
const MIN_TABLE_WIDTH = 260;
const HEADER_HEIGHT   = 42;
const COLUMN_HEIGHT   = 36;
const ADD_BTN_HEIGHT  = 34;
const TABLE_PADDING   = 10;
const GAP_X           = 80;   // minimum horizontal gap between nodes
const GAP_Y           = 80;   // minimum vertical gap between nodes

function getDim(table: Table, nodeSizes?: Map<string, { width: number; height: number }>) {
  if (nodeSizes?.has(table.id)) return nodeSizes.get(table.id)!;
  return {
    width:  MIN_TABLE_WIDTH,
    height: HEADER_HEIGHT + table.columns.length * COLUMN_HEIGHT + ADD_BTN_HEIGHT + TABLE_PADDING,
  };
}

/**
 * Compute the minimum ring radius so that nodes placed uniformly on an ellipse
 * do not overlap each other. aspectY controls ellipse squish (0.75 = screen-friendly).
 */
function computeRingRadius(nodes: GraphNode[], gapBetween: number, aspectY = 0.75): number {
  const n = nodes.length;
  if (n <= 1) return 0;
  // Each node occupies an arc proportional to its larger dimension + gap
  const totalArcLen = nodes.reduce((s, nd) => s + Math.max(nd.width, nd.height) + gapBetween, 0);
  return totalArcLen / (2 * Math.PI) / Math.max(aspectY, 0.3);
}

/**
 * Iterative AABB-based overlap removal.
 * Resolves along the axis with the smaller penetration depth.
 * Runs until stable or maxPasses exceeded.
 */
function removeOverlaps(nodes: GraphNode[], gap = GAP_X, maxPasses = 20) {
  for (let pass = 0; pass < maxPasses; pass++) {
    let anyShifted = false;
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const needX = (a.width + b.width) / 2 + gap;
        const needY = (a.height + b.height) / 2 + gap;

        if (Math.abs(dx) < needX && Math.abs(dy) < needY) {
          const ovX = needX - Math.abs(dx);
          const ovY = needY - Math.abs(dy);
          anyShifted = true;
          if (ovX <= ovY) {
            const push = ovX / 2;
            if (dx >= 0) { a.x += push; b.x -= push; }
            else         { a.x -= push; b.x += push; }
          } else {
            const push = ovY / 2;
            if (dy >= 0) { a.y += push; b.y -= push; }
            else         { a.y -= push; b.y += push; }
          }
        }
      }
    }
    if (!anyShifted) break;
  }
}

// ─── AutoLayout class ─────────────────────────────────────────────────────────
export class AutoLayout {
  private static readonly DEFAULT_OPTIONS: LayoutOptions = {
    algorithm: 'force-directed',
    spacing: { x: 350, y: 280 },
    centerOffset: { x: 400, y: 300 },
    iterations: 300,
  };

  static layoutTables(
    tables: Table[],
    relationships: Relationship[],
    options: Partial<LayoutOptions> = {}
  ): Table[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };
    switch (opts.algorithm) {
      case 'grid':            return this.gridLayout(tables, opts);
      case 'hierarchical':    return this.hierarchicalLayout(tables, relationships, opts);
      case 'force-directed':  return this.forceDirectedLayout(tables, relationships, opts);
      case 'circular':        return this.circularLayout(tables, relationships, opts);
      case 'warehouse':       return this.warehouseLayout(tables, relationships, opts);
      default:                return this.forceDirectedLayout(tables, relationships, opts);
    }
  }

  // ── GRID: per-column max-width, per-row max-height, zero overlap ───────────
  private static gridLayout(tables: Table[], opts: LayoutOptions): Table[] {
    if (!tables.length) return [];

    const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
    const cols = Math.ceil(Math.sqrt(sorted.length));
    const dims = sorted.map(t => getDim(t, opts.nodeSizes));

    const colW: number[] = new Array(cols).fill(0);
    const rowH: number[] = [];
    dims.forEach((d, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      colW[col] = Math.max(colW[col], d.width);
      rowH[row] = Math.max(rowH[row] ?? 0, d.height);
    });

    // Build cumulative X offsets per column
    const colX: number[] = [];
    let curX = opts.centerOffset.x;
    for (let c = 0; c < cols; c++) {
      colX.push(curX);
      curX += colW[c] + GAP_X;
    }

    // Build cumulative Y offsets per row
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

  // ── HIERARCHICAL: level height = max node height in that level ─────────────
  private static hierarchicalLayout(
    tables: Table[],
    relationships: Relationship[],
    opts: LayoutOptions
  ): Table[] {
    if (!tables.length) return [];

    const children = new Map<string, string[]>();
    const inDeg    = new Map<string, number>();
    tables.forEach(t => { children.set(t.id, []); inDeg.set(t.id, 0); });
    relationships.forEach(r => {
      children.get(r.sourceTableId)?.push(r.targetTableId);
      inDeg.set(r.targetTableId, (inDeg.get(r.targetTableId) ?? 0) + 1);
    });

    const levels: string[][] = [];
    const visited = new Set<string>();
    let queue = tables.filter(t => !inDeg.get(t.id)).map(t => t.id);
    if (!queue.length) queue = [tables[0].id];

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
      if (levels.length > tables.length) break;
    }

    const remaining = tables.filter(t => !visited.has(t.id)).map(t => t.id);
    if (remaining.length) levels.push(remaining);

    const tMap = new Map(tables.map(t => [t.id, t]));
    const result: Table[] = [];
    let curY = opts.centerOffset.y;

    for (const level of levels) {
      const lds  = level.map(id => getDim(tMap.get(id)!, opts.nodeSizes));
      const maxH = Math.max(...lds.map(d => d.height));
      const totalW = lds.reduce((s, d) => s + d.width, 0) + GAP_X * (level.length - 1);
      let curX = opts.centerOffset.x - totalW / 2;

      for (let i = 0; i < level.length; i++) {
        result.push({ ...tMap.get(level[i])!, position: { x: curX, y: curY } });
        curX += lds[i].width + GAP_X;
      }
      curY += maxH + GAP_Y;
    }

    return result;
  }

  // ── FORCE-DIRECTED: size-aware k, bounding-box repulsion, overlap removal ──
  private static forceDirectedLayout(
    tables: Table[],
    relationships: Relationship[],
    opts: LayoutOptions
  ): Table[] {
    const n = tables.length;
    if (!n) return [];

    // Initial positions: deterministic grid, spaced by average node size
    const cols = Math.ceil(Math.sqrt(n));
    const nodes: GraphNode[] = tables.map((t, i) => {
      const dim = getDim(t, opts.nodeSizes);
      return {
        id: t.id, table: t,
        x: opts.centerOffset.x + (i % cols) * (MIN_TABLE_WIDTH + GAP_X * 3),
        y: opts.centerOffset.y + Math.floor(i / cols) * (HEADER_HEIGHT + 8 * COLUMN_HEIGHT + GAP_Y * 3),
        vx: 0, vy: 0,
        width: dim.width, height: dim.height,
      };
    });

    // k = average bounding-box diagonal + gap → drives ideal spring length
    const avgW = nodes.reduce((s, nd) => s + nd.width,  0) / n;
    const avgH = nodes.reduce((s, nd) => s + nd.height, 0) / n;
    const k    = Math.sqrt(avgW * avgH) + GAP_X;
    const T0   = k * 2;
    const iters = opts.iterations ?? 300;
    const nodeIdx = new Map(nodes.map(nd => [nd.id, nd]));

    for (let iter = 0; iter < iters; iter++) {
      const temp = T0 * (1 - iter / iters);

      // Repulsion — bounding-box aware (8× boost when overlapping)
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const u = nodes[i], v = nodes[j];
          const dx = u.x - v.x;
          const dy = u.y - v.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
          const safeX = (u.width + v.width) / 2 + GAP_X;
          const safeY = (u.height + v.height) / 2 + GAP_Y;
          const overlap = Math.abs(dx) < safeX && Math.abs(dy) < safeY;
          const r = (k * k) / dist * (overlap ? 8 : 1);
          u.vx += (dx / dist) * r;  u.vy += (dy / dist) * r;
          v.vx -= (dx / dist) * r;  v.vy -= (dy / dist) * r;
        }
      }

      // Attraction
      for (const rel of relationships) {
        const u = nodeIdx.get(rel.sourceTableId);
        const v = nodeIdx.get(rel.targetTableId);
        if (!u || !v) continue;
        const dx = u.x - v.x;
        const dy = u.y - v.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
        const a = (dist * dist) / k;
        u.vx -= (dx / dist) * a;  u.vy -= (dy / dist) * a;
        v.vx += (dx / dist) * a;  v.vy += (dy / dist) * a;
      }

      // Weak gravity to center
      for (const nd of nodes) {
        nd.vx += (opts.centerOffset.x - nd.x) * 0.02;
        nd.vy += (opts.centerOffset.y - nd.y) * 0.02;
      }

      // Apply velocities
      for (const nd of nodes) {
        const spd = Math.sqrt(nd.vx * nd.vx + nd.vy * nd.vy) || 0.01;
        const lim = Math.min(spd, temp);
        nd.x += (nd.vx / spd) * lim;
        nd.y += (nd.vy / spd) * lim;
        nd.vx = 0; nd.vy = 0;
      }
    }

    removeOverlaps(nodes, GAP_X);

    return nodes.map(nd => ({
      ...nd.table,
      position: { x: Math.round(nd.x), y: Math.round(nd.y) },
    }));
  }

  // ── CIRCULAR (Hub-and-Spoke): ring radius derived from real node sizes ──────
  private static circularLayout(
    tables: Table[],
    relationships: Relationship[],
    opts: LayoutOptions
  ): Table[] {
    if (!tables.length) return [];

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
    const ASPECT = 0.75;

    // Inner (hub) ring
    if (hubNodes.length === 1) {
      hubNodes[0].x = cx; hubNodes[0].y = cy;
    } else {
      const innerR = computeRingRadius(hubNodes, GAP_X, 1.0);
      hubNodes.forEach((nd, i) => {
        const a = (2 * Math.PI * i) / hubNodes.length - Math.PI / 2;
        nd.x = cx + innerR * Math.cos(a);
        nd.y = cy + innerR * Math.sin(a);
      });
      removeOverlaps(hubNodes, GAP_X);
    }

    // Outer (peripheral) ellipse
    if (periNodes.length) {
      const hubOuterR = hubNodes.length > 1
        ? Math.max(...hubNodes.map(nd => Math.sqrt((nd.x - cx) ** 2 + (nd.y - cy) ** 2)))
        : Math.max(...hubNodes.map(nd => Math.max(nd.width, nd.height) / 2));
      const minR  = hubOuterR + Math.max(...periNodes.map(nd => Math.max(nd.width, nd.height) / 2)) + GAP_X * 2;
      const ringR = Math.max(computeRingRadius(periNodes, GAP_X, ASPECT), minR);

      periNodes.forEach((nd, i) => {
        const a = (2 * Math.PI * i) / periNodes.length - Math.PI / 2;
        nd.x = cx + ringR * Math.cos(a);
        nd.y = cy + ringR * ASPECT * Math.sin(a);
      });
      removeOverlaps(periNodes, GAP_X);
    }

    return [...hubNodes, ...periNodes].map(nd => ({
      ...nd.table,
      position: { x: Math.round(nd.x), y: Math.round(nd.y) },
    }));
  }

  // ── WAREHOUSE: per-cluster dynamic ring radius ─────────────────────────────
  private static warehouseLayout(
    tables: Table[],
    relationships: Relationship[],
    opts: LayoutOptions
  ): Table[] {
    if (!tables.length) return [];

    const adj = new Map<string, Set<string>>(tables.map(t => [t.id, new Set()]));
    for (const r of relationships) {
      adj.get(r.sourceTableId)?.add(r.targetTableId);
      adj.get(r.targetTableId)?.add(r.sourceTableId);
    }

    const sorted    = [...tables].sort((a, b) => (adj.get(b.id)?.size ?? 0) - (adj.get(a.id)?.size ?? 0));
    const factCount = Math.max(1, Math.ceil(tables.length * 0.15));
    const facts     = sorted.slice(0, factCount);
    const dimTables = sorted.slice(factCount);

    const placedIds = new Set<string>();
    const allNodes: GraphNode[] = [];

    const mkNode = (t: Table, x = 0, y = 0): GraphNode => ({
      id: t.id, table: t, x, y, vx: 0, vy: 0, ...getDim(t, opts.nodeSizes),
    });

    // Generous fact-cell spacing: each cell = fact node + full ring of dims on both sides
    const MAX_DIM_NODES_ESTIMATE = 8;
    const AVG_DIM_WIDTH   = MIN_TABLE_WIDTH + GAP_X * 2;
    const estRingEstimate = (MAX_DIM_NODES_ESTIMATE * AVG_DIM_WIDTH) / (2 * Math.PI) + GAP_X;
    const factCols        = Math.ceil(Math.sqrt(facts.length));
    const factSpacingX    = estRingEstimate * 2 + MIN_TABLE_WIDTH + GAP_X * 4;
    const factSpacingY    = estRingEstimate * 2 + (HEADER_HEIGHT + 6 * COLUMN_HEIGHT) + GAP_Y * 4;

    facts.forEach((fact, fi) => {
      const col = fi % factCols;
      const row = Math.floor(fi / factCols);
      const fx  = opts.centerOffset.x + col * factSpacingX;
      const fy  = opts.centerOffset.y + row * factSpacingY;

      const fNode = mkNode(fact, fx, fy);
      allNodes.push(fNode);
      placedIds.add(fact.id);

      const connected = dimTables.filter(d =>
        !placedIds.has(d.id) &&
        (adj.get(fact.id)?.has(d.id) || adj.get(d.id)?.has(fact.id))
      );
      if (!connected.length) return;

      const dimNodes = connected.map(d => mkNode(d));

      // Ring radius: from actual dim node sizes, pushed clear of fact node
      const fDim        = getDim(fact, opts.nodeSizes);
      const factHalf    = Math.max(fDim.width, fDim.height) / 2;
      const maxDimHalf  = Math.max(...dimNodes.map(nd => Math.max(nd.width, nd.height) / 2));
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

      removeOverlaps([fNode, ...dimNodes], GAP_X);
      allNodes.push(...dimNodes);
    });

    // Orphans stacked on the left
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

  // ── RECOMMEND ─────────────────────────────────────────────────────────────
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