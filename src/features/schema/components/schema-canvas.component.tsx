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
import { Plus, Download, Upload, RotateCcw, Settings, Database, Code2 } from "lucide-react";

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
  const { tables, relationships, updateTable, clearSchema, loadSchema, exportSchema } = useSchema();
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const tableOps = useTableOperations();
  const columnOps = useColumnOperations();
  const relationshipOps = useRelationshipOperations();
  const canvasState = useCanvasState();
  const { getNodes, setNodes, screenToFlowPosition, fitView } = useReactFlow();

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

    canvasState.setPendingConnectionData({
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
    canvasState.resetCanvasState();
  }, [clearSchema, canvasState]);

  const handleExport = useCallback(() => canvasState.openExportDialog(), [canvasState]);
  const handleImport = useCallback(() => canvasState.openImportDialog(), [canvasState]);
  const handleSettings = useCallback(() => canvasState.openSettingsDialog(), [canvasState]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const result = reactFlowIntegration.handleDrop(event);
      if (result) tableOps.createNewTable(result.position);
    },
    [reactFlowIntegration, tableOps]
  );

  const handleNodeClick = useCallback(
    (event: React.MouseEvent, node: any) => {
      canvasState.selectNode(node.id);
      reactFlowIntegration.handleNodeClick(event, node);
    },
    [canvasState, reactFlowIntegration]
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
      if (table) canvasState.showNodeContextMenu(event.clientX, event.clientY, node.id, table);
    },
    [tableOps, canvasState]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.preventDefault();
      const relationship = relationshipOps.findRelationship(edge.id);
      if (relationship) canvasState.showEdgeContextMenu(event.clientX, event.clientY, edge.id, relationship);
    },
    [relationshipOps, canvasState]
  );

  const handlePaneClick = useCallback(() => {
    canvasState.hideAllContextMenus();
    canvasState.selectNode(null);
    canvasState.setPendingConnectionData(null);
  }, [canvasState]);

  const handleDeleteTable = useCallback(
    (tableId: string) => {
      tableOps.deleteExistingTable(tableId);
      canvasState.selectNode(null);
    },
    [tableOps, canvasState]
  );

  const handleDuplicateTable = useCallback(
    (table: any) => tableOps.duplicateExistingTable(table),
    [tableOps]
  );

  const handleEditTable = useCallback(
    (tableId: string) => canvasState.selectNode(tableId),
    [canvasState]
  );

  const handleToggleConnections = useCallback(
    (tableId: string) => {
      const table = tableOps.findTable(tableId);
      if (table) canvasState.showConnectionPanel(table);
    },
    [tableOps, canvasState]
  );

  const handleHighlightConnection = useCallback(
    (relationshipId: string) => canvasState.highlightEdgeTemporarily(relationshipId, 2000),
    [canvasState]
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
      const pending = canvasState.pendingConnection;
      if (!pending) return;
      try {
        relationshipOps.createNewRelationship(
          pending.source,
          pending.sourceHandle,
          pending.target,
          pending.targetHandle,
          type
        );
        canvasState.setPendingConnectionData(null);
      } catch (error) {
        console.error("Failed to create relationship:", error);
      }
    },
    [canvasState, relationshipOps]
  );

  const handleCancelRelationship = useCallback(() => {
    canvasState.setPendingConnectionData(null);
  }, [canvasState]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") { e.preventDefault(); handleSettings(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "t") { e.preventDefault(); handleAddTable(); }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") { e.preventDefault(); handleExport(); }
      if (e.key === "Delete" && canvasState.selectedNodeId) { e.preventDefault(); handleDeleteTable(canvasState.selectedNodeId); }
      if ((e.ctrlKey || e.metaKey) && e.key === "d" && canvasState.selectedNodeId) {
        e.preventDefault();
        const table = tableOps.findTable(canvasState.selectedNodeId);
        if (table) handleDuplicateTable(table);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canvasState.selectedNodeId, handleAddTable, handleDeleteTable, handleDuplicateTable, handleExport, handleSettings, tableOps]);

  return (
    <div className="w-full h-screen bg-background">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="px-4 py-2.5 bg-card border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded bg-primary flex items-center justify-center">
                  <span className="text-primary-foreground font-bold text-xs">SC</span>
                </div>
                <span className="text-sm font-semibold text-foreground">SchemaCanvas</span>
              </div>
              <Button onClick={handleAddTable} size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="h-4 w-4 mr-1.5" />
                Add Table
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-1.5" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-1.5" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSchema}>
                <RotateCcw className="h-4 w-4 mr-1.5" />
                Clear
              </Button>
              <Button variant="outline" size="sm" onClick={handleSettings}>
                <Settings className="h-4 w-4 mr-1.5" />
                Settings
              </Button>
              <Button
                variant={isEditorOpen ? "default" : "outline"}
                size="sm"
                onClick={() => setIsEditorOpen((v) => !v)}
                title="Toggle DBML editor"
              >
                <Code2 className="h-4 w-4 mr-1.5" />
                DBML
              </Button>
            </div>
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
        <ExportDialog isOpen={canvasState.isExportDialogOpen} onClose={canvasState.closeExportDialog} />
        <ImportDialog isOpen={canvasState.isImportDialogOpen} onClose={canvasState.closeImportDialog} />
        <SettingsDialog isOpen={canvasState.isSettingsDialogOpen} onClose={canvasState.closeSettingsDialog} />

        {/* Context Menus */}
        {canvasState.contextMenu && (
          <NodeContextMenu
            x={canvasState.contextMenu.x}
            y={canvasState.contextMenu.y}
            nodeId={canvasState.contextMenu.nodeId}
            table={canvasState.contextMenu.table}
            connections={relationshipOps.getRelationshipsForTable(canvasState.contextMenu.nodeId)}
            isVisible={!!canvasState.contextMenu}
            onClose={canvasState.hideAllContextMenus}
            onDeleteTable={handleDeleteTable}
            onDuplicateTable={handleDuplicateTable}
            onEditTable={handleEditTable}
            onToggleConnections={handleToggleConnections}
            onExportTable={handleExportTable}
          />
        )}

        {canvasState.edgeContextMenu && (
          <EdgeContextMenu
            x={canvasState.edgeContextMenu.x}
            y={canvasState.edgeContextMenu.y}
            edgeId={canvasState.edgeContextMenu.edgeId}
            relationship={canvasState.edgeContextMenu.relationship}
            allTables={tables}
            isVisible={!!canvasState.edgeContextMenu}
            onClose={canvasState.hideAllContextMenus}
            onUpdateRelationship={relationshipOps.updateRelationshipProperties}
            onDeleteRelationship={relationshipOps.deleteExistingRelationship}
          />
        )}

        {canvasState.connectionPanelTable && (
          <div className="fixed top-20 right-4 z-40">
            <ConnectionPanel
              table={canvasState.connectionPanelTable}
              relationships={relationshipOps.getRelationshipsForTable(canvasState.connectionPanelTable.id)}
              allTables={tables}
              onHighlightConnection={handleHighlightConnection}
              onDeleteRelationship={relationshipOps.deleteExistingRelationship}
              onClose={canvasState.hideConnectionPanel}
            />
          </div>
        )}

        {canvasState.pendingConnection && (
          <RelationshipTypeSelector
            sourceColumn={canvasState.pendingConnection.sourceColumn}
            targetColumn={canvasState.pendingConnection.targetColumn}
            onSelectType={handleSelectRelationshipType}
            onCancel={handleCancelRelationship}
          />
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
