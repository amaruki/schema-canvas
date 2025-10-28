/**
 * Refactored Schema Canvas Component with better separation of concerns
 */

"use client";

import React, { useCallback, useRef, useEffect } from "react";
import {
  ReactFlow,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
  ColorMode,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useSchema } from "@/hooks/use-schema";
import { useTableOperations } from "@/features/schema/hooks/use-table-operations";
import { useColumnOperations } from "@/features/schema/hooks/use-column-operations";
import { useRelationshipOperations } from "@/features/schema/hooks/use-relationship-operations";
import { useCanvasState } from "@/features/schema/hooks/use-canvas-state";
import { useReactFlowIntegration } from "@/features/schema/hooks/use-react-flow-integration";
import { generateTableSQL } from "@/features/schema/utils/sql-generator.utils";
import { EXPORT_FORMATS, SQL_DIALECTS } from "@/constants/schema";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Plus, Download, Upload, RotateCcw, Settings } from "lucide-react";

// Components that will be refactored later
import TableNode from "@/components/schema/table-node";
import RelationshipEdge from "@/components/schema/relationship-edge";
import ExportDialog from "@/components/export/export-dialog";
import ImportDialog from "@/components/import/import-dialog";
import SettingsDialog from "@/components/settings/settings-dialog";
import NodeContextMenu from "@/components/schema/node-context-menu";
import EdgeContextMenu from "@/components/schema/edge-context-menu";
import ConnectionPanel from "@/components/schema/connection-panel";
import RelationshipTypeSelector from "@/components/schema/relationship-type-selector";

// Component types
const nodeTypes = {
  table: TableNode,
};

const edgeTypes = {
  relationship: RelationshipEdge,
};

const SchemaCanvasContent: React.FC = () => {
  // Schema data and operations
  const { tables, relationships, clearSchema } = useSchema();
  const tableOps = useTableOperations();
  const columnOps = useColumnOperations();
  const relationshipOps = useRelationshipOperations();

  // Canvas state management
  const canvasState = useCanvasState();

  // React Flow integration
  const reactFlowIntegration = useReactFlowIntegration(
    tables,
    relationships,
    handleConnection
  );

  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  // Handle new connection creation
  function handleConnection(params: any) {
    if (
      !params.source ||
      !params.target ||
      !params.sourceHandle ||
      !params.targetHandle
    ) {
      return;
    }

    const sourceTable = tableOps.findTable(params.source);
    const targetTable = tableOps.findTable(params.target);

    if (!sourceTable || !targetTable) {
      return;
    }

    const sourceColumn = sourceTable.columns.find(
      (c) => c.id === params.sourceHandle
    );
    const targetColumn = targetTable.columns.find(
      (c) => c.id === params.targetHandle
    );

    if (!sourceColumn || !targetColumn) {
      return;
    }

    // Store the pending connection and show relationship type selector
    canvasState.setPendingConnectionData({
      source: params.source,
      sourceHandle: params.sourceHandle,
      target: params.target,
      targetHandle: params.targetHandle,
      sourceColumn: {
        name: sourceColumn.name,
        table: sourceTable.name,
      },
      targetColumn: {
        name: targetColumn.name,
        table: targetTable.name,
      },
    });
  }

  // Event handlers
  const handleAddTable = useCallback(() => {
    tableOps.createNewTable();
  }, [tableOps]);

  const handleClearSchema = useCallback(() => {
    clearSchema();
    canvasState.resetCanvasState();
  }, [clearSchema, canvasState]);

  const handleExport = useCallback(() => {
    canvasState.openExportDialog();
  }, [canvasState]);

  const handleImport = useCallback(() => {
    canvasState.openImportDialog();
  }, [canvasState]);

  const handleSettings = useCallback(() => {
    canvasState.openSettingsDialog();
  }, [canvasState]);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      const result = reactFlowIntegration.handleDrop(event);
      if (result) {
        tableOps.createNewTable(result.position);
      }
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
      const table = tableOps.findTable(node.id);
      if (table) {
        console.log("Double-clicked table:", table.name);
        // TODO: Could trigger edit mode here
      }
      reactFlowIntegration.handleNodeDoubleClick(event, node);
    },
    [tableOps, reactFlowIntegration]
  );

  const handleNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: any) => {
      event.preventDefault();
      const table = tableOps.findTable(node.id);
      if (table) {
        canvasState.showNodeContextMenu(
          event.clientX,
          event.clientY,
          node.id,
          table
        );
      }
    },
    [tableOps, canvasState]
  );

  const handleEdgeContextMenu = useCallback(
    (event: React.MouseEvent, edge: any) => {
      event.preventDefault();
      const relationship = relationshipOps.findRelationship(edge.id);
      if (relationship) {
        canvasState.showEdgeContextMenu(
          event.clientX,
          event.clientY,
          edge.id,
          relationship
        );
      }
    },
    [relationshipOps, canvasState]
  );

  const handlePaneClick = useCallback(() => {
    canvasState.hideAllContextMenus();
    canvasState.selectNode(null);
    canvasState.setPendingConnectionData(null);
  }, [canvasState]);

  // Context menu handlers
  const handleDeleteTable = useCallback(
    (tableId: string) => {
      tableOps.deleteExistingTable(tableId);
      canvasState.selectNode(null);
    },
    [tableOps, canvasState]
  );

  const handleDuplicateTable = useCallback(
    (table: any) => {
      tableOps.duplicateExistingTable(table);
    },
    [tableOps]
  );

  const handleEditTable = useCallback(
    (tableId: string) => {
      const table = tableOps.findTable(tableId);
      if (table) {
        canvasState.selectNode(tableId);
        // TODO: Could trigger edit mode here
        console.log("Edit table:", table.name);
      }
    },
    [tableOps, canvasState]
  );

  const handleToggleConnections = useCallback(
    (tableId: string) => {
      const table = tableOps.findTable(tableId);
      if (table) {
        canvasState.showConnectionPanel(table);
      }
    },
    [tableOps, canvasState]
  );

  const handleHighlightConnection = useCallback(
    (relationshipId: string) => {
      canvasState.highlightEdgeTemporarily(relationshipId, 2000);
    },
    [canvasState]
  );

  const handleExportTable = useCallback((table: any) => {
    const sql = generateTableSQL(table, {
      dialect: "postgresql",
      includeDescriptions: false,
      dropTables: false,
    });

    const blob = new Blob([sql], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${table.name}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

  // Relationship handlers
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
        // Could show error toast here
      }
    },
    [canvasState, relationshipOps]
  );

  const handleCancelRelationship = useCallback(() => {
    canvasState.setPendingConnectionData(null);
  }, [canvasState]);


  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ",") {
        e.preventDefault();
        handleSettings();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "t") {
        e.preventDefault();
        handleAddTable();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "e") {
        e.preventDefault();
        handleExport();
      }
      if (e.key === "Delete" && canvasState.selectedNodeId) {
        e.preventDefault();
        handleDeleteTable(canvasState.selectedNodeId);
      }
      if (
        (e.ctrlKey || e.metaKey) &&
        e.key === "d" &&
        canvasState.selectedNodeId
      ) {
        e.preventDefault();
        const table = tableOps.findTable(canvasState.selectedNodeId);
        if (table) {
          handleDuplicateTable(table);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    canvasState.selectedNodeId,
    handleAddTable,
    handleDeleteTable,
    handleDuplicateTable,
    handleExport,
    handleSettings,
    tableOps,
  ]);

  return (
    <div className="w-full h-screen bg-background">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="p-4 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold text-sm">
                    SC
                  </span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    SchemaCanvas
                  </h1>
                  <p className="text-xs text-muted-foreground">
                    Visual Database Designer
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={handleAddTable}
                  size="sm"
                  className="bg-linear-to-r from-primary to-primary/90 text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Table
                </Button>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleClearSchema}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Clear
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSettings}
                className="border-border hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 relative" ref={reactFlowWrapper}>
          <ReactFlow
            nodes={reactFlowIntegration.nodes}
            edges={reactFlowIntegration.edges}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            onNodesChange={reactFlowIntegration.onNodesChange}
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
              className="bg-card border border-border rounded-lg overflow-hidden"
            />

            {/* Welcome Panel */}
            {reactFlowIntegration.nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none">
                <Card className="p-8 max-w-lg pointer-events-auto bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🗃️</span>
                    </div>
                    <h3 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                      Welcome to SchemaCanvas
                    </h3>
                    <p className="text-muted-foreground">
                      Visual Database Designer
                    </p>
                  </div>

                  <div className="bg-linear-to-r from-primary/5 to-primary/10 rounded-xl p-4 mb-4">
                    <h4 className="font-semibold text-foreground mb-3">
                      Quick Start Guide
                    </h4>
                    <div className="text-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          1
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Add tables using the button
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Click "Add Table" to create your first table
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          2
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Customize your tables and columns
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Edit table names and add columns with different
                            types
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">
                          3
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            Create relationships between tables
                          </p>
                          <p className="text-muted-foreground text-xs">
                            Drag from column handles to create relationships
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center">
                    <Button
                      onClick={handleAddTable}
                      className="bg-linear-to-r from-primary to-primary/90 text-primary-foreground shadow-sm hover:opacity-90 transition-opacity"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Create Your First Table
                    </Button>
                  </div>
                </Card>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* Dialogs */}
        <ExportDialog
          isOpen={canvasState.isExportDialogOpen}
          onClose={canvasState.closeExportDialog}
        />
        <ImportDialog
          isOpen={canvasState.isImportDialogOpen}
          onClose={canvasState.closeImportDialog}
        />
        <SettingsDialog
          isOpen={canvasState.isSettingsDialogOpen}
          onClose={canvasState.closeSettingsDialog}
        />

        {/* Context Menus */}
        {canvasState.contextMenu && (
          <NodeContextMenu
            x={canvasState.contextMenu.x}
            y={canvasState.contextMenu.y}
            nodeId={canvasState.contextMenu.nodeId}
            table={canvasState.contextMenu.table}
            connections={relationshipOps.getRelationshipsForTable(
              canvasState.contextMenu.nodeId
            )}
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

        {/* Panels */}
        {canvasState.connectionPanelTable && (
          <div className="fixed top-20 right-4 z-40">
            <ConnectionPanel
              table={canvasState.connectionPanelTable}
              relationships={relationshipOps.getRelationshipsForTable(
                canvasState.connectionPanelTable.id
              )}
              allTables={tables}
              onHighlightConnection={handleHighlightConnection}
              onDeleteRelationship={relationshipOps.deleteExistingRelationship}
              onClose={canvasState.hideConnectionPanel}
            />
          </div>
        )}

        {/* Relationship Type Selector */}
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

// Main component wrapper with ReactFlowProvider
const SchemaCanvas: React.FC = () => {
  return (
    <ReactFlowProvider>
      <SchemaCanvasContent />
    </ReactFlowProvider>
  );
};

export default SchemaCanvas;
