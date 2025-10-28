/**
 * Hook for managing React Flow integration with schema data - FIXED
 */

import { useCallback, useEffect, useState, useMemo } from 'react';
import {
  useNodesState,
  useEdgesState,
  Node,
  Edge,
  Connection,
  addEdge,
  useReactFlow,
  ColorMode,
  NodeChange,
  EdgeChange,
  applyNodeChanges,
  applyEdgeChanges
} from '@xyflow/react';
import { useTheme } from 'next-themes';
import type { Table, Relationship, SchemaNode, SchemaEdge } from '@/features/schema/types/schema.types';

export const useReactFlowIntegration = (
  tables: Table[],
  relationships: Relationship[],
  onConnection: (connection: Connection) => void
) => {
  const { theme, resolvedTheme } = useTheme();
  const reactFlowInstance = useReactFlow();

  // State
  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync React Flow color mode with next-themes
  useEffect(() => {
    if (mounted) {
      const currentTheme = resolvedTheme || 'light';
      setColorMode(currentTheme as ColorMode);
    }
  }, [resolvedTheme, mounted]);

  // Convert tables to ReactFlow nodes - MEMOIZED to prevent infinite loops
  const nodes = useMemo((): SchemaNode[] => {
    return tables.map((table: Table) => {
      // Ensure position is valid
      const position = table.position || { x: 0, y: 0 };
      return {
        id: table.id,
        type: 'table' as const,
        position,
        draggable: true,
        selectable: true,
        data: {
          table,
          onTableUpdate: () => {},
          onColumnUpdate: () => {},
          onColumnDelete: () => {},
          onColumnAdd: () => {},
        },
      };
    });
  }, [tables]); // Only recreate when tables change

  // Convert relationships to ReactFlow edges - MEMOIZED to prevent infinite loops
  const edges = useMemo((): SchemaEdge[] => {
    return relationships.map((relationship: Relationship) => ({
      id: relationship.id,
      source: relationship.sourceTableId,
      target: relationship.targetTableId,
      sourceHandle: relationship.sourceColumnId,
      targetHandle: relationship.targetColumnId,
      type: 'relationship' as const,
      data: {
        relationship,
        onRelationshipUpdate: () => {},
        onRelationshipDelete: () => {},
      },
    }));
  }, [relationships]); // Only recreate when relationships change

  // React Flow state
  const [rfNodes, setNodes, onNodesChange] = useNodesState<SchemaNode>(nodes);
  const [rfEdges, setEdges, onEdgesChange] = useEdgesState<SchemaEdge>(edges);

  // Sync React Flow state with computed nodes/edges ONLY when they actually change
  useEffect(() => {
    // More robust comparison to avoid unnecessary updates
    const nodesChanged = rfNodes.length !== nodes.length ||
      rfNodes.some((node, index) => {
        const computedNode = nodes[index];
        return !computedNode ||
          node.id !== computedNode.id ||
          node.position.x !== computedNode.position.x ||
          node.position.y !== computedNode.position.y ||
          JSON.stringify(node.data) !== JSON.stringify(computedNode.data);
      });

    if (nodesChanged) {
      setNodes(nodes);
    }
  }, [nodes]); // Don't include setNodes or rfNodes in deps

  useEffect(() => {
    // More robust comparison for edges to ensure relationship type changes are detected
    const edgesChanged = rfEdges.length !== edges.length ||
      rfEdges.some((edge, index) => {
        const computedEdge = edges[index];
        if (!computedEdge) return true;

        // Check basic edge properties
        if (edge.id !== computedEdge.id ||
            edge.source !== computedEdge.source ||
            edge.target !== computedEdge.target ||
            edge.sourceHandle !== computedEdge.sourceHandle ||
            edge.targetHandle !== computedEdge.targetHandle) {
          return true;
        }

        // Check relationship data changes, especially the type
        const currentRelationship = edge.data.relationship;
        const computedRelationship = computedEdge.data.relationship;

        if (!currentRelationship || !computedRelationship) return true;

        // Most importantly, check if relationship type changed
        if (currentRelationship.type !== computedRelationship.type) {
          return true;
        }

        // Check other relationship properties
        return JSON.stringify(currentRelationship) !== JSON.stringify(computedRelationship);
      });

    if (edgesChanged) {
      setEdges(edges);
    }
  }, [edges]); // Don't include setEdges or rfEdges in deps

  // Custom onNodesChange that handles both React Flow changes and schema updates
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    // Validate changes before applying
    const validChanges = changes.filter(change => {
      if (change.type === 'position') {
        const nodeExists = rfNodes.some(node => node.id === change.id);
        if (!nodeExists) {
          console.error(`Node with id ${change.id} not found`);
          return false;
        }
      }
      return true;
    });
    
    if (validChanges.length > 0) {
      onNodesChange(validChanges as NodeChange<SchemaNode>[]);
    }
  }, [onNodesChange, rfNodes]);

  // Custom onEdgesChange that handles both React Flow changes and schema updates
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(changes as EdgeChange<SchemaEdge>[]);
  }, [onEdgesChange]);

  // Handle new connections
  const handleConnect = useCallback(
    (params: Connection) => {
      onConnection(params);
    },
    [onConnection]
  );

  // Drag and drop handlers
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow');

      if (typeof type === 'undefined' || !type) {
        return;
      }

      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      return { type, position };
    },
    [reactFlowInstance]
  );

  // Node handlers
  const handleNodeClick = useCallback((event: React.MouseEvent, node: SchemaNode) => {
    // Handled by parent component
  }, []);

  const handleNodeDoubleClick = useCallback((event: React.MouseEvent, node: SchemaNode) => {
    // Handled by parent component
  }, []);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: SchemaNode) => {
    // Handled by parent component
  }, []);

  // Edge handlers
  const handleEdgeContextMenu = useCallback((event: React.MouseEvent, edge: SchemaEdge) => {
    // Handled by parent component
  }, []);

  // Pane click handler
  const handlePaneClick = useCallback(() => {
    // Handled by parent component
  }, []);

  // Helper to find node by ID
  const findNode = useCallback((nodeId: string): SchemaNode | undefined => {
    return rfNodes.find(node => node.id === nodeId);
  }, [rfNodes]);

  // Helper to find edge by ID
  const findEdge = useCallback((edgeId: string): SchemaEdge | undefined => {
    return rfEdges.find(edge => edge.id === edgeId);
  }, [rfEdges]);

  // Helper to update node position
  const updateNodePosition = useCallback((nodeId: string, position: { x: number; y: number }) => {
    const change: NodeChange<SchemaNode> = {
      id: nodeId,
      type: 'position',
      position
    };
    handleNodesChange([change]);
  }, [handleNodesChange]);

  // Helper to get table from node
  const getTableFromNode = useCallback((nodeId: string): Table | undefined => {
    const node = findNode(nodeId);
    return node?.data.table;
  }, [findNode]);

  // Helper to get relationship from edge
  const getRelationshipFromEdge = useCallback((edgeId: string): Relationship | undefined => {
    const edge = findEdge(edgeId);
    return edge?.data.relationship;
  }, [findEdge]);

  // Fit view helper
  const fitView = useCallback((options?: { padding?: number; duration?: number }) => {
    reactFlowInstance.fitView(options);
  }, [reactFlowInstance]);

  // Center view helper
  const centerView = useCallback(() => {
    reactFlowInstance.fitView({ padding: 0.1 });
  }, [reactFlowInstance]);

  // Zoom to node helper
  const zoomToNode = useCallback((nodeId: string, padding = 0.2) => {
    reactFlowInstance.fitView({
      padding,
      includeHiddenNodes: false,
      nodes: [{ id: nodeId }]
    });
  }, [reactFlowInstance]);

  return {
    // State - use the React Flow managed state
    nodes: rfNodes,
    edges: rfEdges,
    colorMode,
    mounted,

    // Setters
    setNodes,
    setEdges,

    // Handlers
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    handleConnect,
    handleDragOver,
    handleDrop,
    handleNodeClick,
    handleNodeDoubleClick,
    handleNodeContextMenu,
    handleEdgeContextMenu,
    handlePaneClick,

    // Helpers
    findNode,
    findEdge,
    updateNodePosition,
    getTableFromNode,
    getRelationshipFromEdge,
    fitView,
    centerView,
    zoomToNode,
    screenToFlowPosition: reactFlowInstance.screenToFlowPosition
  };
};