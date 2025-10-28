/**
 * Hook for managing canvas-specific state (UI state, not schema state)
 */

import { useState, useCallback } from 'react';
import type {
  NodeContextMenuState,
  EdgeContextMenuState,
  PendingConnection,
  Table
} from '@/features/schema/types/schema.types';

export const useCanvasState = () => {
  // Dialog states
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Connection states
  const [isConnecting, setIsConnecting] = useState(false);
  const [pendingConnection, setPendingConnection] = useState<PendingConnection | null>(null);

  // Context menu states
  const [contextMenu, setContextMenu] = useState<NodeContextMenuState | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<EdgeContextMenuState | null>(null);

  // Selection states
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);

  // Panel states
  const [connectionPanelTable, setConnectionPanelTable] = useState<Table | null>(null);

  // Dialog actions
  const openExportDialog = useCallback(() => setIsExportDialogOpen(true), []);
  const closeExportDialog = useCallback(() => setIsExportDialogOpen(false), []);

  const openImportDialog = useCallback(() => setIsImportDialogOpen(true), []);
  const closeImportDialog = useCallback(() => setIsImportDialogOpen(false), []);

  const openSettingsDialog = useCallback(() => setIsSettingsDialogOpen(true), []);
  const closeSettingsDialog = useCallback(() => setIsSettingsDialogOpen(false), []);

  // Connection actions
  const startConnection = useCallback(() => setIsConnecting(true), []);
  const endConnection = useCallback(() => {
    setIsConnecting(false);
    setPendingConnection(null);
  }, []);

  const setPendingConnectionData = useCallback((data: PendingConnection | null) => {
    setPendingConnection(data);
  }, []);

  // Context menu actions
  const showNodeContextMenu = useCallback((
    x: number,
    y: number,
    nodeId: string,
    table: Table
  ) => {
    setContextMenu({ x, y, nodeId, table });
    setEdgeContextMenu(null);
  }, []);

  const showEdgeContextMenu = useCallback((
    x: number,
    y: number,
    edgeId: string,
    relationship: any
  ) => {
    setEdgeContextMenu({ x, y, edgeId, relationship });
    setContextMenu(null);
  }, []);

  const hideAllContextMenus = useCallback(() => {
    setContextMenu(null);
    setEdgeContextMenu(null);
  }, []);

  // Selection actions
  const selectNode = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const highlightEdge = useCallback((edgeId: string | null) => {
    setHighlightedEdgeId(edgeId);
  }, []);

  const highlightEdgeTemporarily = useCallback((edgeId: string, duration = 2000) => {
    setHighlightedEdgeId(edgeId);
    setTimeout(() => setHighlightedEdgeId(null), duration);
  }, []);

  // Panel actions
  const showConnectionPanel = useCallback((table: Table) => {
    setConnectionPanelTable(table);
  }, []);

  const hideConnectionPanel = useCallback(() => {
    setConnectionPanelTable(null);
  }, []);

  // Clear all states (useful for navigation or reset)
  const clearAllStates = useCallback(() => {
    hideAllContextMenus();
    selectNode(null);
    highlightEdge(null);
    hideConnectionPanel();
    endConnection();
    closeExportDialog();
    closeImportDialog();
    closeSettingsDialog();
  }, [
    hideAllContextMenus,
    selectNode,
    highlightEdge,
    hideConnectionPanel,
    endConnection,
    closeExportDialog,
    closeImportDialog,
    closeSettingsDialog
  ]);

  // Reset canvas state (keep dialogs, clear selections)
  const resetCanvasState = useCallback(() => {
    hideAllContextMenus();
    selectNode(null);
    highlightEdge(null);
    hideConnectionPanel();
    endConnection();
  }, [
    hideAllContextMenus,
    selectNode,
    highlightEdge,
    hideConnectionPanel,
    endConnection
  ]);

  return {
    // Dialog states
    isExportDialogOpen,
    isImportDialogOpen,
    isSettingsDialogOpen,
    openExportDialog,
    closeExportDialog,
    openImportDialog,
    closeImportDialog,
    openSettingsDialog,
    closeSettingsDialog,

    // Connection states
    isConnecting,
    pendingConnection,
    startConnection,
    endConnection,
    setPendingConnectionData,

    // Context menu states
    contextMenu,
    edgeContextMenu,
    showNodeContextMenu,
    showEdgeContextMenu,
    hideAllContextMenus,

    // Selection states
    selectedNodeId,
    highlightedEdgeId,
    selectNode,
    highlightEdge,
    highlightEdgeTemporarily,

    // Panel states
    connectionPanelTable,
    showConnectionPanel,
    hideConnectionPanel,

    // Global actions
    clearAllStates,
    resetCanvasState
  };
};