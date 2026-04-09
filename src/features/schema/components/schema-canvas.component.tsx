"use client";

import React, { useCallback, useRef, useEffect, useState } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  ReactFlowProvider,
  Panel,
  useReactFlow,
  ConnectionMode,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useSchema } from "@/hooks/use-schema";
import { useTableOperations } from "@/features/schema/hooks/use-table-operations";
import { useColumnOperations } from "@/features/schema/hooks/use-column-operations";
import { useRelationshipOperations } from "@/features/schema/hooks/use-relationship-operations";
import { useCanvasState } from "@/features/schema/hooks/use-canvas-state";
import { useReactFlowIntegration } from "@/features/schema/hooks/use-react-flow-integration";
import { generateTableSQL } from "@/features/schema/utils/sql-generator.utils";
import { findOpenSlot } from "@/lib/layout/smart-placement";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Download, Upload, RotateCcw, Settings, Database, Code2, Save, History, MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { SchemaSelector } from "@/components/schema/schema-selector";
import TableNode from "@/components/schema/table-node";
import RelationshipEdge from "@/components/schema/relationship-edge";
import ExportDialog from "@/components/export/export-dialog";
import ImportDialog from "@/components/import/import-dialog";
import SettingsDialog from "@/components/settings/settings-dialog";
import NodeContextMenu from "@/components/schema/node-context-menu";
import EdgeContextMenu from "@/components/schema/edge-context-menu";
import ConnectionPanel from "@/components/schema/connection-panel";
import RelationshipTypeSelector from "@/components/schema/relationship-type-selector";
import LayoutPanel from "@/components/schema/layout-panel";
import SchemaEditorPane from "@/components/schema/schema-editor-pane";
import DetailLevelToggle from "@/components/schema/detail-level-toggle";
import VersionHistoryPanel from "@/components/schema/version-history-panel";
import TableSearch from "@/components/schema/table-search";

const nodeTypes = { table: TableNode };
const edgeTypes = { relationship: RelationshipEdge };

// Strip handle suffix to get the base column ID
function columnIdFromHandle(handleId: string): string {
  return handleId
    .replace(/-left-target$/, "")
    .replace(/-right-target$/, "")
    .replace(/-left$/, "")
    .replace(/-right$/, "");
}

const SchemaCanvasContent: React.FC = () => {
  const tables = useSchema((s) => s.tables);
  const relationships = useSchema((s) => s.relationships);
  const updateTable = useSchema((s) => s.updateTable);
  const clearSchema = useSchema((s) => s.clearSchema);
  const loadSchema = useSchema((s) => s.loadSchema);
  const exportSchema = useSchema((s) => s.exportSchema);
  const saveVersion = useSchema((s) => s.saveVersion);
  const activeSchemaId = useSchema((s) => s.activeSchemaId);
  
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const tableOps = useTableOperations();
  const columnOps = useColumnOperations();
  const relationshipOps = useRelationshipOperations();
  
  // Canvas State Selectors
  const setPendingConnectionData = useCanvasState((s) => s.setPendingConnectionData);
  const openExportDialog = useCanvasState((s) => s.openExportDialog);
  const openImportDialog = useCanvasState((s) => s.openImportDialog);
  const openSettingsDialog = useCanvasState((s) => s.openSettingsDialog);
  const resetCanvasState = useCanvasState((s) => s.resetCanvasState);
  const selectNode = useCanvasState((s) => s.selectNode);
  const toggleNodeSelection = useCanvasState((s) => s.toggleNodeSelection);
  const selectAllNodes = useCanvasState((s) => s.selectAllNodes);
  const clearSelection = useCanvasState((s) => s.clearSelection);
  const showNodeContextMenu = useCanvasState((s) => s.showNodeContextMenu);
  const showEdgeContextMenu = useCanvasState((s) => s.showEdgeContextMenu);
  const setHoveredNode = useCanvasState((s) => s.setHoveredNode);
  const hideAllContextMenus = useCanvasState((s) => s.hideAllContextMenus);
  const showConnectionPanel = useCanvasState((s) => s.showConnectionPanel);
  const highlightEdgeTemporarily = useCanvasState((s) => s.highlightEdgeTemporarily);
  const hideConnectionPanel = useCanvasState((s) => s.hideConnectionPanel);
  const toggleVersionHistory = useCanvasState((s) => s.toggleVersionHistory);
  
  const hoveredNodeId = useCanvasState((s) => s.hoveredNodeId);
  const selectedNodeId = useCanvasState((s) => s.selectedNodeId);
  const selectedNodeIds = useCanvasState((s) => s.selectedNodeIds);
  const setHighlightedTableIds = useCanvasState((s) => s.setHighlightedTableIds);
  
  // Dialog Open States
  const isExportDialogOpen = useCanvasState((s) => s.isExportDialogOpen);
  const closeExportDialog = useCanvasState((s) => s.closeExportDialog);
  const isImportDialogOpen = useCanvasState((s) => s.isImportDialogOpen);
  const closeImportDialog = useCanvasState((s) => s.closeImportDialog);
  const isSettingsDialogOpen = useCanvasState((s) => s.isSettingsDialogOpen);
  const closeSettingsDialog = useCanvasState((s) => s.closeSettingsDialog);
  
  // Additional States
  const contextMenu = useCanvasState((s) => s.contextMenu);
  const edgeContextMenu = useCanvasState((s) => s.edgeContextMenu);
  const connectionPanelTable = useCanvasState((s) => s.connectionPanelTable);
  const pendingConnection = useCanvasState((s) => s.pendingConnection);
  const isVersionHistoryOpen = useCanvasState((s) => s.isVersionHistoryOpen);
  
  const { getNodes, setNodes, screenToFlowPosition, fitView } = useReactFlow();

  // Compute Highlighted Tables O(1)
  useEffect(() => {
    const activeIds = hoveredNodeId
      ? new Set([hoveredNodeId])
      : selectedNodeIds.size > 0
      ? selectedNodeIds
      : null;

    if (!activeIds || activeIds.size === 0) {
      setHighlightedTableIds(new Set());
      return;
    }

    // Add active + neighbors
    const ids = new Set<string>(activeIds);
    relationships.forEach(rel => {
      if (activeIds.has(rel.sourceTableId)) ids.add(rel.targetTableId);
      if (activeIds.has(rel.targetTableId)) ids.add(rel.sourceTableId);
    });
    setHighlightedTableIds(ids);
  }, [hoveredNodeId, selectedNodeId, selectedNodeIds, relationships, setHighlightedTableIds]);

  const reactFlowIntegration = useReactFlowIntegration(
    tables,
    relationships,
    handleConnection
  );

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  function handleConnection(params: any) {
    if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;

    const sourceTable = tableOps.findTable(params.source);
    const targetTable = tableOps.findTable(params.target);
    if (!sourceTable || !targetTable) return;

    const sourceColId = columnIdFromHandle(params.sourceHandle);
    const targetColId = columnIdFromHandle(params.targetHandle);

    const sourceColumn = sourceTable.columns.find((c) => c.id === sourceColId);
    const targetColumn = targetTable.columns.find((c) => c.id === targetColId);
    if (!sourceColumn || !targetColumn) return;

    setPendingConnectionData({
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle,
      sourceColumn: { name: sourceColumn.name, table: sourceTable.name },
      targetColumn: { name: targetColumn.name, table: targetTable.name },
    });
  }

  const getCenterPosition = useCallback(() => {
    const container = reactFlowWrapper.current;
    if (container) {
      const rect = container.getBoundingClientRect();
      return screenToFlowPosition({
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
      });
    }
    return { x: 200, y: 200 };
  }, [screenToFlowPosition]);

  const handleAddTable = useCallback(() => {
    const center = getCenterPosition();
    const position = findOpenSlot(getNodes(), center);
    tableOps.createNewTable(position);
  }, [tableOps, getNodes, getCenterPosition]);

  const handleSaveVersion = useCallback(async () => {
    if (!activeSchemaId) return;
    const label = prompt("Enter version label (optional):");
    if (label !== null) {
      await saveVersion(label);
    }
  }, [activeSchemaId, saveVersion]);

  const handleLayout = useCallback(
    (updatedTables: typeof tables) => {
      updatedTables.forEach((t) => updateTable(t.id, { position: t.position }));
      // Fit view after layout with a small delay to let positions settle
      setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
    },
    [updateTable, fitView]
  );

  const handleSchemaChange = useCallback(
    (newTables: typeof tables, newRelationships: typeof relationships) => {
      loadSchema({ ...exportSchema(), tables: newTables, relationships: newRelationships });
    },
    [loadSchema, exportSchema]
  );

  // Persist final drag position to store so it survives re-renders
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    reactFlowIntegration.onNodesChange(changes);
    changes.forEach((change: any) => {
      if (change.type === 'position' && change.position && !change.dragging) {
        tableOps.updateTablePosition(change.id, change.position);
      }
    });
  }, [reactFlowIntegration, tableOps]);

  const handleClearSchema = useCallback(() => {
    clearSchema();
    resetCanvasState();
  }, [clearSchema, resetCanvasState]);

  const handleExport = useCallback(() => openExportDialog(), [openExportDialog]);
  const handleImport = useCallback(() => openImportDialog(), [openImportDialog]);
  const handleSettings = useCallback(() => openSettingsDialog(), [openSettingsDialog]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const result = reactFlowIntegration.handleDrop(event);
      if (result) tableOps.createNewTable(result.position);
    },
    [reactFlowIntegration, tableOps]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: any) => {
      if (event.ctrlKey || event.metaKey) {
        toggleNodeSelection(node.id);
      } else {
        selectNode(node.id);
      }
      reactFlowIntegration.handleNodeClick(event, node);
    },
    [selectNode, toggleNodeSelection, reactFlowIntegration]
  );

  const handleNodeDoubleClick = useCallback(
    (event: React.MouseEvent, node: any) => {
      reactFlowIntegration.handleNodeDoubleClick(event, node);
    },
    [reactFlowIntegration]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      const table = tableOps.findTable(node.id);
      if (table) showNodeContextMenu(event.clientX, event.clientY, node.id, table);
    },
    [tableOps, showNodeContextMenu]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.preventDefault();
      const relationship = relationshipOps.findRelationship(edge.id);
      if (relationship) showEdgeContextMenu(event.clientX, event.clientY, edge.id, relationship);
    },
    [relationshipOps, showEdgeContextMenu]
  );
  
  const handleNodeMouseEnter = useCallback(
    (_: React.MouseEvent, node: any) => {
      setHoveredNode(node.id);
    },
    [setHoveredNode]
  );

  const handleNodeMouseLeave = useCallback(
    () => {
      setHoveredNode(null);
    },
    [setHoveredNode]
  );

  const handlePaneClick = useCallback(() => {
    hideAllContextMenus();
    clearSelection();
    setPendingConnectionData(null);
  }, [hideAllContextMenus, clearSelection, setPendingConnectionData]);

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      tableOps.deleteExistingTable(tableId);
      clearSelection();
    },
    [tableOps, clearSelection]
  );

  const handleDeleteSelected = useCallback(() => {
    selectedNodeIds.forEach((id) => tableOps.deleteExistingTable(id));
    clearSelection();
  }, [selectedNodeIds, tableOps, clearSelection]);

  const handleDuplicateTable = useCallback(
    (table: any) => tableOps.duplicateExistingTable(table),
    [tableOps]
  );

  const handleEditTable = useCallback(
    (tableId: string) => selectNode(tableId),
    [selectNode]
  );

  const handleToggleConnections = useCallback(
    (tableId: string) => {
      const table = tableOps.findTable(tableId);
      if (table) showConnectionPanel(table);
    },
    [tableOps, showConnectionPanel]
  );

  const handleHighlightConnection = useCallback(
    (relationshipId: string) => highlightEdgeTemporarily(relationshipId, 2000),
    [highlightEdgeTemporarily]
  );

  const handleExportTable = useCallback((table: any) => {
    const sql = generateTableSQL(table, { dialect: "postgresql", includeDescriptions: false, dropTables: false });
    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.name}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  const handleSelectRelationshipType = useCallback(
    (type: string) => {
      if (!pendingConnection) return;
      try {
        relationshipOps.createNewRelationship(
          pendingConnection.source,
          pendingConnection.sourceHandle,
          pendingConnection.target,
          pendingConnection.targetHandle,
          type
        );
        setPendingConnectionData(null);
      } catch (error) {
        console.error("Failed to create relationship:", error);
      }
    },
    [pendingConnection, relationshipOps, setPendingConnectionData]
  );

  const handleCancelRelationship = useCallback(() => {
    setPendingConnectionData(null);
  }, [setPendingConnectionData]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); handleSettings(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "t") { e.preventDefault(); handleAddTable(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") { e.preventDefault(); handleExport(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "s") { e.preventDefault(); handleSaveVersion(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "a") {
        e.preventDefault();
        selectAllNodes(tables.map((t) => t.id));
      }
      if (e.key === "Escape" && selectedNodeIds.size > 0) {
        e.preventDefault();
        clearSelection();
      }
      if (e.key === "Delete" && selectedNodeIds.size > 0) {
        e.preventDefault();
        handleDeleteSelected();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && selectedNodeId) {
        e.preventDefault();
        const table = tableOps.findTable(selectedNodeId);
        if (table) handleDuplicateTable(table);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedNodeId, selectedNodeIds, tables, selectAllNodes, clearSelection, handleAddTable, handleDeleteTable, handleDeleteSelected, handleDuplicateTable, handleExport, handleSettings, tableOps, handleSaveVersion]);

  return (
    <div className="w-full h-screen bg-background">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-4 py-2 bg-card border-b border-border shadow-sm z-10 flex flex-wrap items-center justify-between gap-3">
          
          {/* Left: Brand & File Selection */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 cursor-default">
              <div className="w-6 h-6 rounded-md bg-primary flex items-center justify-center shadow-inner">
                <span className="text-primary-foreground font-extrabold text-[10px]">SC</span>
              </div>
              <span className="text-sm font-bold tracking-tight text-foreground hidden md:inline-block">SchemaCanvas</span>
            </div>
            
            <div className="h-4 w-px bg-border mx-1 hidden sm:block" />
            <SchemaSelector />
          </div>

          {/* Center: Essential Editing Tools */}
          <div className="flex items-center gap-1.5 bg-muted/40 p-1 rounded-lg border border-border shadow-sm mx-auto absolute left-1/2 -translate-x-1/2 sm:static sm:translate-x-0 hidden sm:flex">
            <Button onClick={handleAddTable} size="sm" variant="ghost" className="h-7 px-3 text-xs font-semibold hover:bg-background">
              <Plus className="h-3.5 w-3.5 mr-1.5" />
              Add Table
            </Button>
            <div className="h-4 w-px bg-border/60 mx-0.5" />
            <div className="hidden lg:block">
              <DetailLevelToggle />
            </div>
          </div>
          
          {/* Right: History & Actions */}
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-muted/40 p-1 rounded-lg border border-border shadow-sm hidden md:flex">
              <Button 
                variant={isVersionHistoryOpen ? "secondary" : "ghost"} 
                size="sm" 
                onClick={toggleVersionHistory}
                className="h-7 px-3 text-xs"
              >
                <History className="h-3.5 w-3.5 mr-1.5" />
                History
              </Button>
              <div className="h-4 w-px bg-border/60 mx-1" />
              <Button variant="ghost" size="sm" onClick={handleSaveVersion} title="Save Version (Ctrl+S)" className="h-7 px-3 text-xs hover:bg-primary/10 hover:text-primary">
                <Save className="h-3.5 w-3.5 mr-1.5" />
                Save Version
              </Button>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 w-9 p-0 shadow-sm">
                  <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={handleImport} className="text-xs cursor-pointer"><Upload className="mr-2 h-3.5 w-3.5" /> Import DBML</DropdownMenuItem>
                <DropdownMenuItem onClick={handleExport} className="text-xs cursor-pointer"><Download className="mr-2 h-3.5 w-3.5" /> Export Postgres SQL</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSettings} className="text-xs cursor-pointer"><Settings className="mr-2 h-3.5 w-3.5" /> Workspace Settings</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleClearSchema} className="text-xs text-destructive focus:text-destructive cursor-pointer">
                  <RotateCcw className="mr-2 h-3.5 w-3.5" /> Clear Canvas
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant={isEditorOpen ? "default" : "outline"}
              size="sm"
              className="h-9 shadow-sm"
              onClick={() => setIsEditorOpen((v) => !v)}
              title="Toggle DBML editor"
            >
              <Code2 className="h-4 w-4 sm:mr-1.5" />
              <span className="hidden sm:inline-block">DBML</span>
            </Button>
          </div>
        </div>

        {/* Schema Stats Bar */}
        <div className="px-4 py-1.5 bg-muted/40 border-b border-border text-[11px] text-muted-foreground flex justify-between items-center">
          <div className="flex gap-4">
            <span>{tables.length} tables</span>
            <span>{relationships.length} relationships</span>
            <span>{tables.reduce((acc, t) => acc + t.columns.length, 0)} columns</span>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] text-muted-foreground">
            {selectedNodeIds.size > 1 && (
              <span className="text-primary font-medium">{selectedNodeIds.size} selected &mdash; </span>
            )}
            <span>Ctrl+Click to multi-select &bull; Ctrl+A to select all &bull; Delete to remove</span>
          </div>
        </div>

        <SchemaEditorPane
          isOpen={isEditorOpen}
          tables={tables}
          relationships={relationships}
          getNodes={getNodes}
          onSchemaChange={handleSchemaChange}
          getCenterPosition={getCenterPosition}
        >
        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={reactFlowIntegration.nodes}
            edges={reactFlowIntegration.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={handleNodesChange}
            onEdgesChange={reactFlowIntegration.onEdgesChange}
            onConnect={reactFlowIntegration.handleConnect}
            onDrop={handleDrop}
            onDragOver={reactFlowIntegration.handleDragOver}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeMouseEnter={handleNodeMouseEnter}
            onNodeMouseLeave={handleNodeMouseLeave}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            onPaneClick={handlePaneClick}
            fitView
            colorMode={reactFlowIntegration.colorMode}
            minZoom={0.1}
            maxZoom={5}
            connectionMode={ConnectionMode.Loose}
          >
            <Background className="bg-background" gap={16} />
            <Controls />
            <MiniMap
              pannable
              zoomable
              nodeColor={(node) => {
                if (node.type === "table") return "hsl(var(--primary))";
                return "hsl(var(--background))";
              }}
              className="bg-card border border-border rounded overflow-hidden"
            />

            {/* Layout Panel */}
            <Panel position="bottom-center" style={{ marginBottom: "8px" }}>
              <LayoutPanel
                tables={tables}
                relationships={relationships}
                onLayout={handleLayout}
              />
            </Panel>

            {/* Welcome Panel */}
            {reactFlowIntegration.nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none">
                <Card className="p-6 max-w-md pointer-events-auto bg-card border border-border shadow-md">
                  <div className="flex items-center gap-3 mb-4">
                    <Database className="h-5 w-5 text-primary shrink-0" />
                    <h3 className="text-base font-semibold text-foreground">Welcome to SchemaCanvas</h3>
                  </div>
                  <div className="bg-muted rounded p-3 mb-4">
                    <p className="text-xs font-medium text-foreground mb-2">Quick Start</p>
                    <div className="text-xs space-y-2 text-muted-foreground">
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-muted-foreground/60 shrink-0">1.</span>
                        <span>Click "Add Table" to create a table</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-muted-foreground/60 shrink-0">2.</span>
                        <span>Edit table names and add columns</span>
                      </div>
                      <div className="flex items-start gap-2">
                        <span className="font-mono text-muted-foreground/60 shrink-0">3.</span>
                        <span>Drag from column handles to create relationships</span>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleAddTable} size="sm" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Table
                  </Button>
                </Card>
              </Panel>
            )}
          </ReactFlow>
        </div>
        </SchemaEditorPane>

        {/* Dialogs */}
        <ExportDialog isOpen={isExportDialogOpen} onClose={closeExportDialog} />
        <ImportDialog isOpen={isImportDialogOpen} onClose={closeImportDialog} />
        <SettingsDialog isOpen={isSettingsDialogOpen} onClose={closeSettingsDialog} />
        <TableSearch />

        {/* Context Menus */}
        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            table={contextMenu.table}
            connections={relationshipOps.getRelationshipsForTable(contextMenu.nodeId)}
            isVisible={!!contextMenu}
            onClose={hideAllContextMenus}
            onDeleteTable={handleDeleteTable}
            onDuplicateTable={handleDuplicateTable}
            onEditTable={handleEditTable}
            onToggleConnections={handleToggleConnections}
            onExportTable={handleExportTable}
          />
        )}

        {edgeContextMenu && (
          <EdgeContextMenu
            x={edgeContextMenu.x}
            y={edgeContextMenu.y}
            edgeId={edgeContextMenu.edgeId}
            relationship={edgeContextMenu.relationship}
            allTables={tables}
            isVisible={!!edgeContextMenu}
            onClose={hideAllContextMenus}
            onUpdateRelationship={relationshipOps.updateRelationshipProperties}
            onDeleteRelationship={relationshipOps.deleteExistingRelationship}
          />
        )}

        {connectionPanelTable && (
          <div className="fixed top-20 right-4 z-40">
            <ConnectionPanel
              table={connectionPanelTable}
              relationships={relationshipOps.getRelationshipsForTable(connectionPanelTable.id)}
              allTables={tables}
              onHighlightConnection={handleHighlightConnection}
              onDeleteRelationship={relationshipOps.deleteExistingRelationship}
              onClose={hideConnectionPanel}
            />
          </div>
        )}

        {pendingConnection && (
          <RelationshipTypeSelector
            sourceColumn={pendingConnection.sourceColumn}
            targetColumn={pendingConnection.targetColumn}
            onSelectType={handleSelectRelationshipType}
            onCancel={handleCancelRelationship}
          />
        )}

        {isVersionHistoryOpen && (
          <VersionHistoryPanel onClose={toggleVersionHistory} />
        )}
      </div>
    </div>
  );
};

const SchemaCanvas: React.FC = () => (
  <ReactFlowProvider>
    <SchemaCanvasContent />
  </ReactFlowProvider>
);

export default SchemaCanvas;
