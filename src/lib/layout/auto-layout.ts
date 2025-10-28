import { Table, Relationship } from '@/types/schema';

export interface LayoutOptions {
  algorithm: 'grid' | 'hierarchical' | 'force-directed' | 'circular';
  spacing: { x: number; y: number };
  centerOffset: { x: number; y: number };
  iterations?: number; // For force-directed layout
}

export interface GraphNode {
  id: string;
  table: Table;
  x: number;
  y: number;
  vx: number; // velocity x for force-directed
  vy: number; // velocity y for force-directed
  fx?: number; // fixed x position
  fy?: number; // fixed y position
}

export interface GraphEdge {
  source: string;
  target: string;
  relationship: Relationship;
}

/**
 * Auto-layout utility for arranging database schema tables
 */
export class AutoLayout {
  private static readonly DEFAULT_OPTIONS: LayoutOptions = {
    algorithm: 'force-directed',
    spacing: { x: 350, y: 280 },
    centerOffset: { x: 400, y: 300 },
    iterations: 300,
  };

  /**
   * Main layout function - arranges tables based on relationships
   */
  static layoutTables(
    tables: Table[],
    relationships: Relationship[],
    options: Partial<LayoutOptions> = {}
  ): Table[] {
    const opts = { ...this.DEFAULT_OPTIONS, ...options };

    switch (opts.algorithm) {
      case 'grid':
        return this.gridLayout(tables, opts);
      case 'hierarchical':
        return this.hierarchicalLayout(tables, relationships, opts);
      case 'force-directed':
        return this.forceDirectedLayout(tables, relationships, opts);
      case 'circular':
        return this.circularLayout(tables, opts);
      default:
        return this.forceDirectedLayout(tables, relationships, opts);
    }
  }

  /**
   * Simple grid layout with improved spacing
   */
  private static gridLayout(tables: Table[], options: LayoutOptions): Table[] {
    const columns = Math.ceil(Math.sqrt(tables.length));

    return tables.map((table, index) => {
      const row = Math.floor(index / columns);
      const col = index % columns;

      return {
        ...table,
        position: {
          x: options.centerOffset.x + col * options.spacing.x,
          y: options.centerOffset.y + row * options.spacing.y,
        },
      };
    });
  }

  /**
   * Hierarchical layout - places tables in levels based on relationships
   */
  private static hierarchicalLayout(
    tables: Table[],
    relationships: Relationship[],
    options: LayoutOptions
  ): Table[] {
    // Create adjacency list
    const adjacencyList = new Map<string, Set<string>>();
    const inDegree = new Map<string, number>();

    tables.forEach(table => {
      adjacencyList.set(table.id, new Set());
      inDegree.set(table.id, 0);
    });

    // Build graph from relationships
    relationships.forEach(rel => {
      const targets = adjacencyList.get(rel.sourceTableId);
      if (targets) {
        targets.add(rel.targetTableId);
        inDegree.set(rel.targetTableId, (inDegree.get(rel.targetTableId) || 0) + 1);
      }
    });

    // Topological sort to determine levels
    const levels: string[][] = [];
    const visited = new Set<string>();
    const queue: string[] = [];

    // Find root nodes (no incoming edges)
    tables.forEach(table => {
      if ((inDegree.get(table.id) || 0) === 0) {
        queue.push(table.id);
      }
    });

    while (queue.length > 0) {
      const currentLevel = [...queue];
      queue.length = 0; // Clear queue
      levels.push(currentLevel);

      currentLevel.forEach(nodeId => {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);

        const neighbors = adjacencyList.get(nodeId);
        if (neighbors) {
          neighbors.forEach(neighbor => {
            const degree = (inDegree.get(neighbor) || 0) - 1;
            inDegree.set(neighbor, degree);
            if (degree === 0 && !visited.has(neighbor)) {
              queue.push(neighbor);
            }
          });
        }
      });
    }

    // Add any remaining nodes to last level
    const remainingNodes = tables.filter(t => !visited.has(t.id));
    if (remainingNodes.length > 0) {
      levels.push(remainingNodes.map(t => t.id));
    }

    // Position tables based on levels
    const levelMap = new Map<string, number>();
    levels.forEach((level, index) => {
      level.forEach(nodeId => levelMap.set(nodeId, index));
    });

    return tables.map(table => {
      const level = levelMap.get(table.id) || 0;
      const levelTables = levels[level];
      const indexInLevel = levelTables.indexOf(table.id);
      const levelWidth = levelTables.length;

      return {
        ...table,
        position: {
          x: options.centerOffset.x + (indexInLevel - levelWidth / 2) * options.spacing.x,
          y: options.centerOffset.y + level * options.spacing.y,
        },
      };
    });
  }

  /**
   * Force-directed layout using Fruchterman-Reingold algorithm
   */
  private static forceDirectedLayout(
    tables: Table[],
    relationships: Relationship[],
    options: LayoutOptions
  ): Table[] {
    const iterations = options.iterations || 300;
    const k = Math.sqrt((options.spacing.x * options.spacing.y) / tables.length);
    const temperature = Math.max(options.spacing.x, options.spacing.y) / 10;

    // Create graph nodes
    const nodes: GraphNode[] = tables.map((table, index) => ({
      id: table.id,
      table,
      x: Math.random() * options.centerOffset.x * 2,
      y: Math.random() * options.centerOffset.y * 2,
      vx: 0,
      vy: 0,
    }));

    // Create graph edges
    const edges: GraphEdge[] = relationships.map(rel => ({
      source: rel.sourceTableId,
      target: rel.targetTableId,
      relationship: rel,
    }));

    // Force-directed algorithm
    for (let iter = 0; iter < iterations; iter++) {
      const t = temperature * (1 - iter / iterations); // Cooling

      // Calculate repulsive forces between all pairs
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[j].x - nodes[i].x;
          const dy = nodes[j].y - nodes[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          if (dist < k * 3) { // Only repel if close enough
            const force = (k * k) / dist;
            const fx = (dx / dist) * force;
            const fy = (dy / dist) * force;

            nodes[i].vx -= fx;
            nodes[i].vy -= fy;
            nodes[j].vx += fx;
            nodes[j].vy += fy;
          }
        }
      }

      // Calculate attractive forces for connected nodes
      edges.forEach(edge => {
        const sourceNode = nodes.find(n => n.id === edge.source);
        const targetNode = nodes.find(n => n.id === edge.target);

        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;

          const force = (dist * dist) / k;
          const fx = (dx / dist) * force;
          const fy = (dy / dist) * force;

          sourceNode.vx += fx;
          sourceNode.vy += fy;
          targetNode.vx -= fx;
          targetNode.vy -= fy;
        }
      });

      // Update positions with temperature-based damping
      nodes.forEach(node => {
        if (node.fx === undefined) {
          const displacement = Math.min(Math.sqrt(node.vx * node.vx + node.vy * node.vy), t);
          const angle = Math.atan2(node.vy, node.vx);

          node.x += Math.cos(angle) * displacement;
          node.y += Math.sin(angle) * displacement;
        }
        node.vx = 0;
        node.vy = 0;
      });
    }

    // Center the layout
    const centerX = options.centerOffset.x;
    const centerY = options.centerOffset.y;

    const avgX = nodes.reduce((sum, node) => sum + node.x, 0) / nodes.length;
    const avgY = nodes.reduce((sum, node) => sum + node.y, 0) / nodes.length;

    const offsetX = centerX - avgX;
    const offsetY = centerY - avgY;

    // Apply positions to tables
    return tables.map(table => {
      const node = nodes.find(n => n.id === table.id);
      if (node) {
        return {
          ...table,
          position: {
            x: Math.round(node.x + offsetX),
            y: Math.round(node.y + offsetY),
          },
        };
      }
      return table;
    });
  }

  /**
   * Circular layout - arranges tables in a circle
   */
  private static circularLayout(tables: Table[], options: LayoutOptions): Table[] {
    const radius = Math.min(options.spacing.x, options.spacing.y) * Math.sqrt(tables.length) / (2 * Math.PI);
    const centerX = options.centerOffset.x;
    const centerY = options.centerOffset.y;

    return tables.map((table, index) => {
      const angle = (2 * Math.PI * index) / tables.length - Math.PI / 2;

      return {
        ...table,
        position: {
          x: Math.round(centerX + radius * Math.cos(angle)),
          y: Math.round(centerY + radius * Math.sin(angle)),
        },
      };
    });
  }

  /**
   * Analyze relationships to determine the best layout algorithm
   */
  static recommendLayout(
    tables: Table[],
    relationships: Relationship[]
  ): LayoutOptions['algorithm'] {
    const tableCount = tables.length;
    const relationshipCount = relationships.length;
    const relationshipRatio = relationshipCount / tableCount;

    // Small number of tables with many relationships -> circular
    if (tableCount <= 6 && relationshipRatio >= 1.5) {
      return 'circular';
    }

    // Many relationships with clear hierarchy -> hierarchical
    if (relationshipRatio >= 0.8 && this.hasClearHierarchy(tables, relationships)) {
      return 'hierarchical';
    }

    // Large number of tables -> force-directed for better space utilization
    if (tableCount >= 10) {
      return 'force-directed';
    }

    // Default to force-directed
    return 'force-directed';
  }

  /**
   * Check if the graph has a clear hierarchical structure
   */
  private static hasClearHierarchy(tables: Table[], relationships: Relationship[]): boolean {
    const inDegree = new Map<string, number>();

    tables.forEach(table => {
      inDegree.set(table.id, 0);
    });

    relationships.forEach(rel => {
      inDegree.set(rel.targetTableId, (inDegree.get(rel.targetTableId) || 0) + 1);
    });

    const rootNodes = Array.from(inDegree.values()).filter(degree => degree === 0).length;
    const maxDepth = this.calculateMaxDepth(tables, relationships);

    return rootNodes > 0 && maxDepth > 2;
  }

  /**
   * Calculate maximum depth of the graph
   */
  private static calculateMaxDepth(tables: Table[], relationships: Relationship[]): number {
    const adjacencyList = new Map<string, string[]>();

    tables.forEach(table => {
      adjacencyList.set(table.id, []);
    });

    relationships.forEach(rel => {
      const targets = adjacencyList.get(rel.sourceTableId);
      if (targets) {
        targets.push(rel.targetTableId);
      }
    });

    const visited = new Set<string>();
    let maxDepth = 0;

    const dfs = (nodeId: string, depth: number): void => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      maxDepth = Math.max(maxDepth, depth);

      const neighbors = adjacencyList.get(nodeId) || [];
      neighbors.forEach(neighbor => {
        dfs(neighbor, depth + 1);
      });
    };

    tables.forEach(table => {
      if (!visited.has(table.id)) {
        dfs(table.id, 0);
      }
    });

    return maxDepth;
  }
}