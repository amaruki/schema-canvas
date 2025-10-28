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
import { Relationship } from '@/types/schema';

interface RelationshipEdgeProps extends EdgeProps {
  data: {
    relationship: Relationship;
    onRelationshipUpdate?: (relationship: Relationship) => void;
    onRelationshipDelete?: (relationshipId: string) => void;
  };
}

// Define relationship types with their visual properties
export const RELATIONSHIP_TYPES = {
  'one-to-one': {
    label: '1:1',
    color: '#10b981', // green-500
    strokeWidth: 2,
    strokeDasharray: '0',
    markerSize: 12,
  },
  'one-to-many': {
    label: '1:N',
    color: '#3b82f6', // blue-500
    strokeWidth: 2,
    strokeDasharray: '0',
    markerSize: 14,
  },
  'many-to-many': {
    label: 'N:N',
    color: '#f59e0b', // amber-500
    strokeWidth: 2.5,
    strokeDasharray: '5,5',
    markerSize: 16,
  },
  'many-to-one': {
    label: 'N:1',
    color: '#8b5cf6', // violet-500
    strokeWidth: 2,
    strokeDasharray: '0',
    markerSize: 14,
  },
  'zero-to-one': {
    label: '0:1',
    color: '#64748b', // slate-500
    strokeWidth: 1.5,
    strokeDasharray: '3,3',
    markerSize: 12,
  },
  'zero-to-many': {
    label: '0:N',
    color: '#06b6d4', // cyan-500
    strokeWidth: 2,
    strokeDasharray: '3,3',
    markerSize: 14,
  },
} as const;

export type RelationshipType = keyof typeof RELATIONSHIP_TYPES;

const RelationshipEdge: React.FC<RelationshipEdgeProps> = ({
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
  if (!data?.relationship) return null;

  const { relationship } = data;
  const typeConfig = RELATIONSHIP_TYPES[relationship.type as RelationshipType] || RELATIONSHIP_TYPES['one-to-many'];

  // Calculate bezier path for smooth curves
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    curvature: 0.25, // Adjust for smoother curves
  });

  const markerId = `arrow-${relationship.type}-${id}`;

  return (
    <>
      {/* Define custom arrow markers */}
      <defs>
        <marker
          id={markerId}
          markerWidth={typeConfig.markerSize}
          markerHeight={typeConfig.markerSize}
          refX={typeConfig.markerSize}
          refY={typeConfig.markerSize / 2}
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d={`M0,0 L0,${typeConfig.markerSize} L${typeConfig.markerSize * 0.8},${typeConfig.markerSize / 2} z`}
            fill={typeConfig.color}
          />
        </marker>
      </defs>

      {/* The edge path */}
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerId})`}
        style={{
          stroke: typeConfig.color,
          strokeWidth: typeConfig.strokeWidth,
          strokeDasharray: typeConfig.strokeDasharray,
          filter: selected ? 'drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))' : undefined,
        }}
      />

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
};

export default RelationshipEdge;