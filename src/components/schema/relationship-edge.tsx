"use client";

import React from 'react';
import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  EdgeProps,
  Position,
} from '@xyflow/react';
import { Badge } from '@/components/ui/badge';
import { useCanvasState } from '@/features/schema/hooks/use-canvas-state';
import { Relationship } from '@/features/schema/types/schema.types';

interface RelationshipEdgeProps extends EdgeProps {
  data: {
    relationship: Relationship;
    isHighlighted?: boolean;
    onRelationshipUpdate?: (relationship: Relationship) => void;
    onRelationshipDelete?: (relationshipId: string) => void;
  };
}

const MARKER_SIZE = 10

// Define relationship types with their visual properties
export const RELATIONSHIP_TYPES = {
  'one-to-one': {
    label: '1:1',
    color: '#10b981', // green-500
    strokeWidth: 2,
    strokeDasharray: '0',
    markerSize: MARKER_SIZE,
  },
  'one-to-many': {
    label: '1:N',
    color: '#3b82f6', // blue-500
    strokeWidth: 2,
    strokeDasharray: '0',
    markerSize: MARKER_SIZE,
  },
  'many-to-many': {
    label: 'N:N',
    color: '#f59e0b', // amber-500
    strokeWidth: 2.5,
    strokeDasharray: '5,5',
    markerSize: MARKER_SIZE,
  },
  'many-to-one': {
    label: 'N:1',
    color: '#8b5cf6', // violet-500
    strokeWidth: 2,
    strokeDasharray: '0',
    markerSize: MARKER_SIZE,
  },
  'zero-to-one': {
    label: '0:1',
    color: '#64748b', // slate-500
    strokeWidth: 1.5,
    strokeDasharray: '3,3',
    markerSize: MARKER_SIZE,
  },
  'zero-to-many': {
    label: '0:N',
    color: '#06b6d4', // cyan-500
    strokeWidth: 2,
    strokeDasharray: '3,3',
    markerSize: MARKER_SIZE,
  },
} as const;

export type RelationshipType = keyof typeof RELATIONSHIP_TYPES;

const RelationshipEdge: React.FC<RelationshipEdgeProps> = React.memo(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  markerEnd,
}) => {
  const relationship = data?.relationship;
  const sourceTableId = relationship?.sourceTableId;
  const targetTableId = relationship?.targetTableId;

  // OPTIMIZATION: Only re-render this specific edge if its highlight state specifically changes.
  // This avoids re-rendering every edge on every mouse move.
  const isHighlighted = useCanvasState((state) => 
    state.hoveredNodeId === sourceTableId || 
    state.hoveredNodeId === targetTableId ||
    state.selectedNodeId === sourceTableId ||
    state.selectedNodeId === targetTableId
  );

  const typeConfig = RELATIONSHIP_TYPES[relationship?.type as RelationshipType] || RELATIONSHIP_TYPES['one-to-many'];

  // Calculate bezier path for smooth curves - memoized to prevent recalculation on every render
  const [edgePath, labelX, labelY] = React.useMemo(() => getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25,
  }), [sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition]);

  if (!relationship) return null;

  const markerId = `arrow-${relationship.type}-${id}`;

  return (
    <>
      {/* Define custom arrow markers */}
      <defs>
        <marker
          id={markerId}
          viewBox="0 0 10 10"
          refX={8}
          refY={5}
          markerWidth={typeConfig.markerSize}
          markerHeight={typeConfig.markerSize}
          orient="auto-start-reverse"
          markerUnits="userSpaceOnUse"
        >
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={typeConfig.color}
          />
        </marker>
      </defs>

      {/* Base Path (always visible, provides structure) */}
      <BaseEdge
        id={`${id}-base`}
        path={edgePath}
        style={{
          stroke: typeConfig.color,
          strokeWidth: typeConfig.strokeWidth,
          strokeDasharray: typeConfig.strokeDasharray,
          opacity: isHighlighted || selected ? 1 : 0.25, // Pop when active, dim when background
          transition: 'opacity 0.3s ease', 
        }}
      />

      {/* Animated Floating Dots (visible on highlight/select) */}
      {(isHighlighted || selected) && (
        <BaseEdge
          id={`${id}-dots`}
          path={edgePath}
          markerEnd={`url(#${markerId})`}
          style={{
            stroke: typeConfig.color,
            strokeWidth: typeConfig.strokeWidth + 2,
            strokeDasharray: '0.1 24',
            strokeLinecap: 'round',
            animation: 'flow 1s linear infinite',
            filter: `drop-shadow(0 0 4px ${typeConfig.color}cc)`,
            opacity: 1, // Full brightness for the animated flow
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Edge label */}
      <EdgeLabelRenderer>
        <div
          style={{
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
            pointerEvents: 'all',
          }}
          className="nodrag nopan"
        >
          <Badge
            variant="secondary"
            className="text-xs font-medium bg-background/95 backdrop-blur-sm border shadow-sm hover:bg-background transition-colors cursor-pointer"
            style={{
              borderColor: typeConfig.color,
              color: typeConfig.color,
            }}
          >
            {typeConfig.label}
          </Badge>
        </div>
      </EdgeLabelRenderer>
    </>
  );
});
RelationshipEdge.displayName = 'RelationshipEdge';

export default RelationshipEdge;