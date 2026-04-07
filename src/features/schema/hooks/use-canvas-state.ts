import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  NodeContextMenuState,
  EdgeContextMenuState,
  PendingConnection,
  Table,
  Relationship
} from '@/features/schema/types/schema.types';

interface CanvasState {
  // Dialog states
  isExportDialogOpen: boolean;
  isImportDialogOpen: boolean;
  isSettingsDialogOpen: boolean;
  
  // Connection states
  isConnecting: boolean;
  pendingConnection: PendingConnection | null;
  
  // Context menu states
  contextMenu: NodeContextMenuState | null;
  edgeContextMenu: EdgeContextMenuState | null;
  
  // Selection/Hover states
  selectedNodeId: string | null;
  hoveredNodeId: string | null;
  highlightedEdgeId: string | null;
  
  // Panel states
  connectionPanelTable: Table | null;

  // Actions
  openExportDialog: () => void;
  closeExportDialog: () => void;
  openImportDialog: () => void;
  closeImportDialog: () => void;
  openSettingsDialog: () => void;
  closeSettingsDialog: () => void;
  
  startConnection: () => void;
  endConnection: () => void;
  setPendingConnectionData: (data: PendingConnection | null) => void;
  
  showNodeContextMenu: (x: number, y: number, nodeId: string, table: Table) => void;
  showEdgeContextMenu: (x: number, y: number, edgeId: string, relationship: Relationship) => void;
  hideAllContextMenus: () => void;
  
  selectNode: (nodeId: string | null) => void;
  setHoveredNode: (nodeId: string | null) => void;
  highlightEdge: (edgeId: string | null) => void;
  highlightEdgeTemporarily: (edgeId: string, duration?: number) => void;
  
  showConnectionPanel: (table: Table) => void;
  hideConnectionPanel: () => void;
  
  clearAllStates: () => void;
  resetCanvasState: () => void;
}

export const useCanvasState = create<CanvasState>()(
  devtools(
    (set) => ({
      // Initial state
      isExportDialogOpen: false,
      isImportDialogOpen: false,
      isSettingsDialogOpen: false,
      isConnecting: false,
      pendingConnection: null,
      contextMenu: null,
      edgeContextMenu: null,
      selectedNodeId: null,
      hoveredNodeId: null,
      highlightedEdgeId: null,
      connectionPanelTable: null,

      // Actions
      openExportDialog: () => set({ isExportDialogOpen: true }),
      closeExportDialog: () => set({ isExportDialogOpen: false }),
      openImportDialog: () => set({ isImportDialogOpen: true }),
      closeImportDialog: () => set({ isImportDialogOpen: false }),
      openSettingsDialog: () => set({ isSettingsDialogOpen: true }),
      closeSettingsDialog: () => set({ isSettingsDialogOpen: false }),

      startConnection: () => set({ isConnecting: true }),
      endConnection: () => set({ isConnecting: false, pendingConnection: null }),
      setPendingConnectionData: (data) => set({ pendingConnection: data }),

      showNodeContextMenu: (x, y, nodeId, table) => set({ 
        contextMenu: { x, y, nodeId, table }, 
        edgeContextMenu: null 
      }),
      showEdgeContextMenu: (x, y, edgeId, relationship) => set({ 
        edgeContextMenu: { x, y, edgeId, relationship }, 
        contextMenu: null 
      }),
      hideAllContextMenus: () => set({ contextMenu: null, edgeContextMenu: null }),

      selectNode: (nodeId) => set({ selectedNodeId: nodeId }),
      setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
      highlightEdge: (edgeId) => set({ highlightedEdgeId: edgeId }),
      highlightEdgeTemporarily: (edgeId, duration = 2000) => {
        set({ highlightedEdgeId: edgeId });
        setTimeout(() => set({ highlightedEdgeId: null }), duration);
      },

      showConnectionPanel: (table) => set({ connectionPanelTable: table }),
      hideConnectionPanel: () => set({ connectionPanelTable: null }),

      clearAllStates: () => set({
        contextMenu: null,
        edgeContextMenu: null,
        selectedNodeId: null,
        hoveredNodeId: null,
        highlightedEdgeId: null,
        connectionPanelTable: null,
        isConnecting: false,
        pendingConnection: null,
        isExportDialogOpen: false,
        isImportDialogOpen: false,
        isSettingsDialogOpen: false,
      }),

      resetCanvasState: () => set({
        contextMenu: null,
        edgeContextMenu: null,
        selectedNodeId: null,
        hoveredNodeId: null,
        highlightedEdgeId: null,
        connectionPanelTable: null,
        isConnecting: false,
        pendingConnection: null,
      }),
    }),
    { name: 'canvas-store' }
  )
);