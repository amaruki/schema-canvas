import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  NodeContextMenuState,
  EdgeContextMenuState,
  PendingConnection,
  Table,
  Relationship
} from '@/features/schema/types/schema.types';

export type DetailLevel = 'compact' | 'keys-only' | 'standard' | 'detailed';

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
  selectedNodeIds: Set<string>;
  hoveredNodeId: string | null;
  highlightedEdgeId: string | null;
  highlightedTableIds: Set<string>;
  
  // Panel states
  connectionPanelTable: Table | null;
  isVersionHistoryOpen: boolean;

  // View Preferences
  detailLevel: DetailLevel;

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
  toggleNodeSelection: (nodeId: string) => void;
  selectAllNodes: (nodeIds: string[]) => void;
  clearSelection: () => void;
  setHoveredNode: (nodeId: string | null) => void;
  highlightEdge: (edgeId: string | null) => void;
  highlightEdgeTemporarily: (edgeId: string, duration?: number) => void;
  setHighlightedTableIds: (ids: Set<string>) => void;
  
  showConnectionPanel: (table: Table) => void;
  hideConnectionPanel: () => void;
  
  toggleVersionHistory: () => void;
  
  setDetailLevel: (level: DetailLevel) => void;
  
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
      selectedNodeIds: new Set<string>(),
      hoveredNodeId: null,
      highlightedEdgeId: null,
      highlightedTableIds: new Set<string>(),
      connectionPanelTable: null,
      isVersionHistoryOpen: false,
      detailLevel: (typeof window !== 'undefined' ? localStorage.getItem('schemaCanvas_detailLevel') || 'standard' : 'standard') as DetailLevel,

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

      selectNode: (nodeId) => set({ selectedNodeId: nodeId, selectedNodeIds: nodeId ? new Set([nodeId]) : new Set() }),
      toggleNodeSelection: (nodeId) => set((state) => {
        const next = new Set(state.selectedNodeIds);
        if (next.has(nodeId)) {
          next.delete(nodeId);
        } else {
          next.add(nodeId);
        }
        return { selectedNodeIds: next, selectedNodeId: next.size === 1 ? [...next][0] : null };
      }),
      selectAllNodes: (nodeIds) => set({ selectedNodeIds: new Set(nodeIds), selectedNodeId: null }),
      clearSelection: () => set({ selectedNodeId: null, selectedNodeIds: new Set() }),
      setHoveredNode: (nodeId) => set({ hoveredNodeId: nodeId }),
      highlightEdge: (edgeId) => set({ highlightedEdgeId: edgeId }),
      highlightEdgeTemporarily: (edgeId, duration = 2000) => {
        set({ highlightedEdgeId: edgeId });
        setTimeout(() => set({ highlightedEdgeId: null }), duration);
      },
      setHighlightedTableIds: (ids) => set({ highlightedTableIds: ids }),

      showConnectionPanel: (table) => set({ connectionPanelTable: table }),
      hideConnectionPanel: () => set({ connectionPanelTable: null }),

      toggleVersionHistory: () => set((state) => ({ isVersionHistoryOpen: !state.isVersionHistoryOpen })),

      setDetailLevel: (level) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('schemaCanvas_detailLevel', level);
        }
        set({ detailLevel: level });
      },

      clearAllStates: () => set({
        contextMenu: null,
        edgeContextMenu: null,
        selectedNodeId: null,
        selectedNodeIds: new Set<string>(),
        hoveredNodeId: null,
        highlightedEdgeId: null,
        highlightedTableIds: new Set<string>(),
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
        selectedNodeIds: new Set<string>(),
        hoveredNodeId: null,
        highlightedEdgeId: null,
        highlightedTableIds: new Set<string>(),
        connectionPanelTable: null,
        isConnecting: false,
        pendingConnection: null,
      }),
    }),
    { name: 'canvas-store' }
  )
);