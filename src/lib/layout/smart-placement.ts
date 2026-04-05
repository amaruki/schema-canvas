import type { Node } from '@xyflow/react';

const SLOT_W = 280;
const SLOT_H = 320;
const MARGIN = 20;
const GRID_SIZE = 5;

function overlaps(
  cx: number,
  cy: number,
  nodes: Node[]
): boolean {
  for (const node of nodes) {
    const nx = node.position.x;
    const ny = node.position.y;
    const nw = (node.measured?.width ?? 260) + MARGIN;
    const nh = (node.measured?.height ?? 300) + MARGIN;

    const noOverlap =
      cx + SLOT_W <= nx ||
      cx >= nx + nw ||
      cy + SLOT_H <= ny ||
      cy >= ny + nh;

    if (!noOverlap) return true;
  }
  return false;
}

/**
 * Finds the first open canvas slot near the viewport center.
 * Falls back to offset from last node if grid is full.
 */
export function findOpenSlot(
  nodes: Node[],
  viewportCenter: { x: number; y: number }
): { x: number; y: number } {
  const startX = Math.round(viewportCenter.x - SLOT_W / 2);
  const startY = Math.round(viewportCenter.y - SLOT_H / 2);

  for (let row = 0; row < GRID_SIZE; row++) {
    for (let col = 0; col < GRID_SIZE; col++) {
      // Spiral outward: alternate positive/negative offsets
      const dc = col % 2 === 0 ? col / 2 : -(col + 1) / 2;
      const dr = row % 2 === 0 ? row / 2 : -(row + 1) / 2;

      const cx = startX + dc * (SLOT_W + MARGIN);
      const cy = startY + dr * (SLOT_H + MARGIN);

      if (!overlaps(cx, cy, nodes)) {
        return { x: cx, y: cy };
      }
    }
  }

  // Fallback: offset 300px right from last node
  if (nodes.length > 0) {
    const last = nodes[nodes.length - 1];
    return { x: last.position.x + 300, y: last.position.y };
  }

  return { x: startX, y: startY };
}
