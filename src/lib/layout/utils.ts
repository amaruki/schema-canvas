import type { GraphNode } from './types';
import { GAP_X } from './constants';

/**
 * Compute the minimum ring radius so that nodes placed uniformly on an ellipse
 * do not overlap each other on the circumference.
 *
 * @param nodes      - nodes that will be placed on the ring
 * @param gapBetween - extra gap between adjacent nodes (pixels)
 * @param aspectY    - ellipse Y/X ratio — values < 1 compress the ring vertically
 */
export function computeRingRadius(
  nodes: GraphNode[],
  gapBetween: number,
  aspectY = 0.75
): number {
  const n = nodes.length;
  if (n <= 1) return 0;
  // Each node occupies an arc proportional to its larger dimension + gap
  const totalArcLen = nodes.reduce(
    (s, nd) => s + Math.max(nd.width, nd.height) + gapBetween,
    0
  );
  return totalArcLen / (2 * Math.PI) / Math.max(aspectY, 0.3);
}

/**
 * Iterative AABB-based overlap removal.
 * Resolves collisions along the axis of least penetration depth.
 * Runs until all nodes are collision-free or `maxPasses` is exceeded.
 *
 * @param nodes     - array mutated in-place
 * @param gap       - minimum gap to maintain between bounding boxes
 * @param maxPasses - safety cap on iterations
 */
export function removeOverlaps(
  nodes: GraphNode[],
  gap = GAP_X,
  maxPasses = 20
): void {
  for (let pass = 0; pass < maxPasses; pass++) {
    let anyShifted = false;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i];
        const b = nodes[j];

        const dx    = a.x - b.x;
        const dy    = a.y - b.y;
        const needX = (a.width  + b.width)  / 2 + gap;
        const needY = (a.height + b.height) / 2 + gap;

        if (Math.abs(dx) < needX && Math.abs(dy) < needY) {
          const ovX = needX - Math.abs(dx);
          const ovY = needY - Math.abs(dy);
          anyShifted = true;

          // Resolve along axis of least penetration
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
