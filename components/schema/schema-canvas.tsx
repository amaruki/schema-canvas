'use client';

import React, { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  addEdge,
  useNodesState,
  useEdgesState,
  Connection,
  Controls,
  MiniMap,
  Background,
  BackgroundVariant,
  ReactFlowProvider,
  Panel,
  ColorMode,
  useReactFlow,
  NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useSchema } from '@/hooks/use-schema';
import { Table, Relationship, SchemaNode, SchemaEdge, Column } from '@/types/schema';
import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import TableNode from './table-node';
import RelationshipEdge from './relationship-edge';
import { Plus, Download, Upload, Save, RotateCcw, Settings, Copy } from 'lucide-react';
import ExportDialog from '@/components/export/export-dialog';
import ImportDialog from '@/components/import/import-dialog';
import SettingsDialog from '@/components/settings/settings-dialog';
import NodeContextMenu from './node-context-menu';
import EdgeContextMenu from './edge-context-menu';
import ConnectionPanel from './connection-panel';
import RelationshipTypeSelector from './relationship-type-selector';

const nodeTypes: NodeTypes = {
  table: TableNode as any,
};

const edgeTypes = {
  relationship: RelationshipEdge as any,
};

// Separate component to use useReactFlow hook
const SchemaCanvasContent: React.FC = () => {
  const { theme, resolvedTheme } = useTheme();
  const {
    tables,
    relationships,
    addTable,
    addRelationship,
    updateRelationship,
    deleteRelationship,
    deleteTable,
    updateTable,
    exportSchema,
    clearSchema,
  } = useSchema();

  const [colorMode, setColorMode] = useState<ColorMode>('light');
  const [mounted, setMounted] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Sync React Flow color mode with next-themes
  useEffect(() => {
    if (mounted) {
      // resolvedTheme gives the actual theme (light/dark), not 'system'
      const currentTheme = resolvedTheme || 'light';
      setColorMode(currentTheme as ColorMode);
    }
  }, [resolvedTheme, mounted]);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    nodeId: string;
    table: Table;
  } | null>(null);
  const [edgeContextMenu, setEdgeContextMenu] = useState<{
    x: number;
    y: number;
    edgeId: string;
    relationship: Relationship;
  } | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Connection panel state
  const [connectionPanelTable, setConnectionPanelTable] = useState<Table | null>(null);
  const [highlightedEdgeId, setHighlightedEdgeId] = useState<string | null>(null);

  // Relationship type selector state
  const [pendingConnection, setPendingConnection] = useState<{
    source: string;
    sourceHandle: string;
    target: string;
    targetHandle: string;
    sourceColumn: { name: string; table: string };
    targetColumn: { name: string; table: string };
  } | null>(null);

  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const reactFlowInstance = useReactFlow();

  // Convert tables to ReactFlow nodes
  useEffect(() => {
    const newNodes: Node[] = tables.map((table: Table) => ({
      id: table.id,
      type: 'table',
      position: table.position,
      data: {
        table,
        onTableUpdate: (updatedTable: any) => {
          // Handle table updates
        },
        onColumnUpdate: (tableId: string, column: any) => {
          // Handle column updates
        },
        onColumnDelete: (tableId: string, columnId: string) => {
          // Handle column deletion
        },
        onColumnAdd: (tableId: string, column: any) => {
          // Handle column addition
        },
      },
    } as Node));
    setNodes(newNodes);
  }, [tables, setNodes]);

  // Convert relationships to ReactFlow edges
  useEffect(() => {
    const newEdges: Edge[] = relationships.map((relationship: Relationship) => ({
      id: relationship.id,
      source: relationship.sourceTableId,
      target: relationship.targetTableId,
      sourceHandle: relationship.sourceColumnId,
      targetHandle: relationship.targetColumnId,
      type: 'relationship', // Use our custom edge type
      data: {
        relationship,
        onRelationshipUpdate: (updatedRelationship: Relationship) => {
          const { id, ...updates } = updatedRelationship;
          updateRelationship(id, updates);
        },
        onRelationshipDelete: deleteRelationship,
      },
    }));
    setEdges(newEdges);
  }, [relationships, setEdges, updateRelationship, deleteRelationship]);

  const onConnect = useCallback(
    (params: Connection) => {
      console.log('🔗 Connection attempt:', params);

      if (params.source && params.target && params.sourceHandle && params.targetHandle) {
        const sourceTable = tables.find((t: Table) => t.id === params.source);
        const targetTable = tables.find((t: Table) => t.id === params.target);

        if (sourceTable && targetTable) {
          const sourceColumn = sourceTable.columns.find((c: Column) => c.id === params.sourceHandle);
          const targetColumn = targetTable.columns.find((c: Column) => c.id === params.targetHandle);

          if (sourceColumn && targetColumn) {
            // Store the pending connection and show relationship type selector
            setPendingConnection({
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
        }
      }
    },
    [tables]
  );


  
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
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

      const newNode: Table = {
        id: `table_${Date.now()}`,
        name: 'New Table',
        position,
        columns: [
          {
            id: `col_${Date.now()}_1`,
            name: 'id',
            type: 'integer',
            nullable: false,
            primaryKey: true,
            unique: true,
          },
        ],
      };

      addTable(newNode);
    },
    [reactFlowInstance, addTable]
  );

  const handleAddTable = () => {
    const newTable: Table = {
      id: `table_${Date.now()}`,
      name: 'New Table',
      position: {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100,
      },
      columns: [
        {
          id: `col_${Date.now()}_1`,
          name: 'id',
          type: 'integer',
          nullable: false,
          primaryKey: true,
          unique: true,
        },
      ],
    };

    addTable(newTable);
  };

  const handleExport = () => {
    setIsExportDialogOpen(true);
  };

  const handleImport = () => {
    setIsImportDialogOpen(true);
  };

  const handleSettings = () => {
    setIsSettingsDialogOpen(true);
  };

  const onDragStart = (event: React.DragEvent, nodeType: string) => {
    event.dataTransfer.setData('application/reactflow', nodeType);
    event.dataTransfer.effectAllowed = 'move';
  };

  // Node action handlers
  const handleNodeContextMenu = (event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    const table = tables.find((t: Table) => t.id === node.id);
    if (table) {
      setContextMenu({
        x: event.clientX,
        y: event.clientY,
        nodeId: node.id,
        table,
      });
    }
  };

  const handleNodeDoubleClick = (event: React.MouseEvent, node: Node) => {
    const table = tables.find((t: Table) => t.id === node.id);
    if (table) {
      // Trigger edit mode in context menu
      setSelectedNodeId(node.id);
      // You could add a proper edit dialog here
      console.log('Double-clicked table:', table.name);
    }
  };

  const handleNodeClick = (event: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  };

  const handleEdgeContextMenu = (event: React.MouseEvent, edge: Edge) => {
    event.preventDefault();
    const relationship = relationships.find((r: Relationship) => r.id === edge.id);
    if (relationship) {
      setEdgeContextMenu({
        x: event.clientX,
        y: event.clientY,
        edgeId: edge.id,
        relationship,
      });
    }
  };

  const handleDeleteTable = (tableId: string) => {
    deleteTable(tableId);
    setSelectedNodeId(null);
  };

  const handleDuplicateTable = (table: Table) => {
    const newTable: Table = {
      ...table,
      id: `table_${Date.now()}`,
      name: `${table.name}_copy`,
      position: {
        x: table.position.x + 50,
        y: table.position.y + 50,
      },
      columns: table.columns.map(col => ({
        ...col,
        id: `col_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`,
      })),
    };
    addTable(newTable);
  };

  const handleEditTable = (tableId: string) => {
    const table = tables.find((t: Table) => t.id === tableId);
    if (table) {
      // For now, just trigger the inline editing mode in the table node
      // The actual editing happens in the table-node component
      setSelectedNodeId(tableId);
      console.log('Edit table:', table.name);
    }
  };

  const handleToggleConnections = (tableId: string) => {
    const table = tables.find((t: Table) => t.id === tableId);
    if (table) {
      setConnectionPanelTable(table);
    }
  };

  const handleHighlightConnection = (relationshipId: string) => {
    setHighlightedEdgeId(relationshipId);
    setTimeout(() => setHighlightedEdgeId(null), 2000);
  };

  const handleSelectRelationshipType = (type: string) => {
    if (pendingConnection) {
      const relationship = {
        sourceTableId: pendingConnection.source,
        sourceColumnId: pendingConnection.sourceHandle,
        targetTableId: pendingConnection.target,
        targetColumnId: pendingConnection.targetHandle,
        type: type as any,
      };

      console.log('✅ Creating relationship:', relationship);
      addRelationship(relationship);
      setPendingConnection(null);
    }
  };

  const handleCancelRelationship = () => {
    setPendingConnection(null);
  };

  const handleExportTable = (table: Table) => {
    // Export single table as SQL or other format
    const sql = generateTableSQL(table);
    const blob = new Blob([sql], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${table.name}.sql`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const generateTableSQL = (table: Table): string => {
    const columns = table.columns.map(col => {
      let columnDef = `  ${col.name} ${col.type.toUpperCase()}`;
      if (!col.nullable) columnDef += ' NOT NULL';
      if (col.primaryKey) columnDef += ' PRIMARY KEY';
      if (col.unique) columnDef += ' UNIQUE';
      if (col.defaultValue) columnDef += ` DEFAULT ${col.defaultValue}`;
      return columnDef;
    }).join(',\n');

    return `CREATE TABLE ${table.name} (\n${columns}\n);\n`;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === ',') {
        e.preventDefault();
        handleSettings();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 't') {
        e.preventDefault();
        handleAddTable();
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        handleExport();
      }
      // Delete selected table
      if (e.key === 'Delete' && selectedNodeId) {
        e.preventDefault();
        handleDeleteTable(selectedNodeId);
      }
      // Duplicate selected table
      if ((e.ctrlKey || e.metaKey) && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        const table = tables.find((t: Table) => t.id === selectedNodeId);
        if (table) {
          handleDuplicateTable(table);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, tables]);

  return (
    <div className="w-full h-screen bg-background">
      <div className="flex flex-col h-full">
        {/* Toolbar */}
        <div className="p-4 bg-card/95 backdrop-blur-xl border-b border-border shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-sm">
                  <span className="text-primary-foreground font-bold text-sm">SC</span>
                </div>
                <div>
                  <h1 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                    SchemaCanvas
                  </h1>
                  <p className="text-xs text-muted-foreground">Visual Database Designer</p>
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
              <Button
                variant="outline"
                size="sm"
                onClick={handleImport}
              >
                <Upload className="h-4 w-4 mr-2" />
                Import
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearSchema}               
              >
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
            nodes={nodes}
            edges={edges}
            edgeTypes={edgeTypes}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={handleNodeClick}
            onNodeDoubleClick={handleNodeDoubleClick}
            onNodeContextMenu={handleNodeContextMenu}
            onEdgeContextMenu={handleEdgeContextMenu}
            nodeTypes={nodeTypes}
            fitView
            colorMode={colorMode}
            onPaneClick={() => {
              setContextMenu(null);
              setEdgeContextMenu(null);
              setSelectedNodeId(null);
              setPendingConnection(null);
            }}
          >
            <Background className="bg-background" gap={16} />
            <Controls />
            <MiniMap pannable zoomable
              nodeColor={(node) => {
                if (node.type === 'table') return 'hsl(var(--primary))';
                return 'hsl(var(--background))';
              }}
              className="bg-card border border-border rounded-lg overflow-hidden"
            />

            {/* Draggable Table Template */}
            {/* <Panel position="top-left">
              <Card className="p-4 bg-card/95 backdrop-blur-lg border border-border shadow-lg">
                <div
                  className="group cursor-move border-2 border-dashed border-border rounded-xl p-6 text-center text-sm transition-all hover:border-primary hover:bg-primary/5"
                  onDragStart={(event) => onDragStart(event, 'table')}
                  draggable
                >
                  <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center transition-colors">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <div className="font-medium text-foreground">
                    Drag to add table
                  </div>
                  <div className="text-xs mt-1 text-muted-foreground">
                    or use the Add Table button
                  </div>
                </div>
              </Card>
            </Panel> */}

            {/* Instructions Panel */}
            {nodes.length === 0 && (
              <Panel position="top-center" className="pointer-events-none">
                <Card className="p-8 max-w-lg pointer-events-auto bg-card/95 backdrop-blur-xl border border-border shadow-2xl">
                  <div className="text-center mb-6">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg">
                      <span className="text-2xl">🗃️</span>
                    </div>
                    <h3 className="text-2xl font-bold bg-linear-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
                      Welcome to SchemaCanvas
                    </h3>
                    <p className="text-muted-foreground">Visual Database Designer</p>
                  </div>

                  <div className="bg-linear-to-r from-primary/5 to-primary/10 rounded-xl p-4 mb-4">
                    <h4 className="font-semibold text-foreground mb-3">Quick Start Guide</h4>
                    <div className="text-sm space-y-3">
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">1</div>
                        <div>
                          <p className="font-medium text-foreground">Add tables using the button or by dragging the template</p>
                          <p className="text-muted-foreground text-xs">Click "Add Table" or drag the component to the canvas</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">2</div>
                        <div>
                          <p className="font-medium text-foreground">Customize your tables and columns</p>
                          <p className="text-muted-foreground text-xs">Edit table names and add columns with different types</p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">3</div>
                        <div>
                          <p className="font-medium text-foreground">Create relationships between tables</p>
                          <p className="text-muted-foreground text-xs">
                            Drag from <span className="inline-block w-3 h-3 bg-blue-400 rounded-full"></span> to <span className="inline-block w-3 h-3 bg-green-400 rounded-full"></span> dots on columns
                          </p>
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0">4</div>
                        <div>
                          <p className="font-medium text-foreground">Export your work in multiple formats</p>
                          <p className="text-muted-foreground text-xs">Generate SQL, Prisma, Django, Laravel, or TypeORM code</p>
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

        {/* Export Dialog */}
        <ExportDialog
          isOpen={isExportDialogOpen}
          onClose={() => setIsExportDialogOpen(false)}
        />

        {/* Import Dialog */}
        <ImportDialog
          isOpen={isImportDialogOpen}
          onClose={() => setIsImportDialogOpen(false)}
        />

        {/* Settings Dialog */}
        <SettingsDialog
          isOpen={isSettingsDialogOpen}
          onClose={() => setIsSettingsDialogOpen(false)}
        />

        {/* Node Context Menu */}
        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            table={contextMenu.table}
            connections={relationships.filter(
              rel => rel.sourceTableId === contextMenu.nodeId || rel.targetTableId === contextMenu.nodeId
            )}
            isVisible={!!contextMenu}
            onClose={() => setContextMenu(null)}
            onDeleteTable={handleDeleteTable}
            onDuplicateTable={handleDuplicateTable}
            onEditTable={handleEditTable}
            onToggleConnections={handleToggleConnections}
            onExportTable={handleExportTable}
          />
        )}

        {/* Connection Panel */}
        {connectionPanelTable && (
          <div className="fixed top-20 right-4 z-40">
            <ConnectionPanel
              table={connectionPanelTable}
              relationships={relationships.filter(
                rel => rel.sourceTableId === connectionPanelTable.id || rel.targetTableId === connectionPanelTable.id
              )}
              allTables={tables}
              onHighlightConnection={handleHighlightConnection}
              onDeleteRelationship={deleteRelationship}
              onClose={() => setConnectionPanelTable(null)}
            />
          </div>
        )}

        {/* Relationship Type Selector */}
        {pendingConnection && (
          <RelationshipTypeSelector
            sourceColumn={pendingConnection.sourceColumn}
            targetColumn={pendingConnection.targetColumn}
            onSelectType={handleSelectRelationshipType}
            onCancel={handleCancelRelationship}
          />
        )}

        {/* Edge Context Menu */}
        {edgeContextMenu && (
          <EdgeContextMenu
            x={edgeContextMenu.x}
            y={edgeContextMenu.y}
            edgeId={edgeContextMenu.edgeId}
            relationship={edgeContextMenu.relationship}
            allTables={tables}
            isVisible={!!edgeContextMenu}
            onClose={() => setEdgeContextMenu(null)}
            onUpdateRelationship={(edgeId, updates) => {
              updateRelationship(edgeId, updates);
            }}
            onDeleteRelationship={deleteRelationship}
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