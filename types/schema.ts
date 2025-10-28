import type { Node, Edge } from "@xyflow/react";

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
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
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
  onDelete?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
  onUpdate?: 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION';
}

export type ColumnType =
  | 'string'
  | 'text'
  | 'integer'
  | 'bigint'
  | 'float'
  | 'decimal'
  | 'boolean'
  | 'date'
  | 'datetime'
  | 'timestamp'
  | 'time'
  | 'json'
  | 'jsonb'
  | 'uuid'
  | 'binary'
  | 'enum'
  | 'array';

export type RelationshipType =
  | 'one-to-one'
  | 'one-to-many'
  | 'many-to-many'
  | 'many-to-one'
  | 'zero-to-one'
  | 'zero-to-many';

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

export interface SchemaNode extends Node {
  data: {
    table: Table;
    onTableUpdate?: (table: Table) => void;
    onColumnUpdate?: (tableId: string, column: Column) => void;
    onColumnDelete?: (tableId: string, columnId: string) => void;
    onColumnAdd?: (tableId: string, column: Column) => void;
  };
}

export interface SchemaEdge extends Omit<Edge, 'data'> {
  data: {
    relationship: Relationship;
    onRelationshipUpdate?: (relationship: Relationship) => void;
    onRelationshipDelete?: (relationshipId: string) => void;
  };
}

// Export formats
export type SQLDialect = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';

export interface ExportOptions {
  format: 'json' | 'sql' | 'prisma' | 'django' | 'laravel' | 'typeorm';
  sqlDialect?: SQLDialect;
  includePositions?: boolean;
  includeDescriptions?: boolean;
}

export interface DatabaseColumn {
  name: string;
  type: string;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
  foreignKey?: string;
}

export interface DatabaseTable {
  name: string;
  columns: DatabaseColumn[];
  foreignKeys: {
    column: string;
    referencesTable: string;
    referencesColumn: string;
    onDelete?: string;
    onUpdate?: string;
  }[];
}

export interface DatabaseSchema {
  name: string;
  tables: DatabaseTable[];
}

// User and project types for later implementation
export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  schema: Schema;
  ownerId: string;
  collaborators: ProjectCollaborator[];
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectCollaborator {
  userId: string;
  role: 'owner' | 'admin' | 'editor' | 'viewer';
  joinedAt: Date;
}