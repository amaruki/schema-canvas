/**
 * Enhanced schema types with better type safety
 */

import type { Node, Edge } from "@xyflow/react";
import type { ColumnType, RelationshipType, ForeignKeyAction } from "@/constants/schema";

export interface Column {
  id: string;
  name: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
  foreignKey?: ForeignKey;
  description?: string;
}

export interface ForeignKey {
  tableId: string;
  columnId: string;
  onDelete?: ForeignKeyAction;
  onUpdate?: ForeignKeyAction;
}

export interface Table {
  id: string;
  name: string;
  position: { x: number; y: number };
  columns: Column[];
  description?: string;
  color?: string;
}

export interface Relationship {
  id: string;
  sourceTableId: string;
  sourceColumnId: string;
  targetTableId: string;
  targetColumnId: string;
  type: RelationshipType;
  name?: string;
  onDelete?: ForeignKeyAction;
  onUpdate?: ForeignKeyAction;
}

export interface Schema {
  id: string;
  name: string;
  description?: string;
  tables: Table[];
  relationships: Relationship[];
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

// React Flow specific types
export interface SchemaNodeData {
  table: Table;
  onTableUpdate?: (table: Table) => void;
  onColumnUpdate?: (tableId: string, column: Column) => void;
  onColumnDelete?: (tableId: string, columnId: string) => void;
  onColumnAdd?: (tableId: string, column: Column) => void;
  [key: string]: unknown;
}

export interface SchemaNode extends Node<SchemaNodeData> {
  // data is provided by the generic Node<SchemaNodeData> type
}

export interface SchemaEdgeData {
  [key: string]: unknown;
  relationship: Relationship;
  onRelationshipUpdate?: (relationship: Relationship) => void;
  onRelationshipDelete?: (relationshipId: string) => void;
}

export interface SchemaEdge extends Omit<Edge, 'data'> {
  data: SchemaEdgeData;
}

// Context menu types
export interface NodeContextMenuState {
  x: number;
  y: number;
  nodeId: string;
  table: Table;
}

export interface EdgeContextMenuState {
  x: number;
  y: number;
  edgeId: string;
  relationship: Relationship;
}

export interface PendingConnection {
  source: string;
  sourceHandle: string;
  target: string;
  targetHandle: string;
  sourceColumn: { name: string; table: string };
  targetColumn: { name: string; table: string };
}

// Component state types
export interface TableNodeState {
  isEditingName: boolean;
  tempName: string;
  isAddingColumn: boolean;
  newColumn: Partial<Column>;
  isEditingColumn: boolean;
  editingColumn: Column | null;
}

export interface CanvasState {
  isConnecting: boolean;
  isExportDialogOpen: boolean;
  isImportDialogOpen: boolean;
  isSettingsDialogOpen: boolean;
  contextMenu: NodeContextMenuState | null;
  edgeContextMenu: EdgeContextMenuState | null;
  selectedNodeId: string | null;
  connectionPanelTable: Table | null;
  highlightedEdgeId: string | null;
  pendingConnection: PendingConnection | null;
}

// Event handler types
export type TableEventHandler = {
  onUpdate: (table: Table) => void;
  onDelete: (tableId: string) => void;
  onDuplicate: (table: Table) => void;
  onEdit: (tableId: string) => void;
  onToggleConnections: (tableId: string) => void;
  onExport: (table: Table) => void;
};

export type ColumnEventHandler = {
  onUpdate: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  onDelete: (tableId: string, columnId: string) => void;
  onAdd: (tableId: string, column: Omit<Column, 'id'>) => void;
  onEdit: (column: Column) => void;
};

export type RelationshipEventHandler = {
  onUpdate: (relationshipId: string, updates: Partial<Relationship>) => void;
  onDelete: (relationshipId: string) => void;
  onSelect: (relationship: Relationship) => void;
};