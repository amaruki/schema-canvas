import type { Table, Relationship } from '@/types/schema';

// ─── Layout Options ────────────────────────────────────────────────────────────
export interface LayoutOptions {
  algorithm: 'grid' | 'hierarchical' | 'force-directed' | 'circular' | 'warehouse';
  spacing: { x: number; y: number };
  centerOffset: { x: number; y: number };
  iterations?: number;
  nodeSizes?: Map<string, { width: number; height: number }>;
}

// ─── Graph node used internally by layout algorithms ──────────────────────────
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

// ─── Graph edge (kept for potential external use) ─────────────────────────────
export interface GraphEdge {
  source: string;
  target: string;
  relationship: Relationship;
}
