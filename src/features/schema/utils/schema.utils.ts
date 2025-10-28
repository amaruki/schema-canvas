/**
 * Schema utility functions - pure business logic
 */

import type { Table, Column, Relationship, ForeignKey } from '@/features/schema/types/schema.types';
import { ID_GENERATORS, DEFAULT_COLUMN, ForeignKeyAction } from '@/constants/schema';

/**
 * Creates a new table with default values
 */
export const createTable = (overrides: Partial<Table> = {}): Omit<Table, 'id'> => ({
  name: 'New Table',
  position: { x: 0, y: 0 },
  columns: [],
  ...overrides
});

/**
 * Creates a new column with default values
 */
export const createColumn = (overrides: Partial<Column> = {}): Omit<Column, 'id'> => ({
  name: '',
  type: 'string',
  nullable: true,
  primaryKey: false,
  unique: false,
  ...overrides
});

/**
 * Creates a new relationship with default values
 */
export const createRelationship = (
  sourceTableId: string,
  sourceColumnId: string,
  targetTableId: string,
  targetColumnId: string,
  type: string
): Omit<Relationship, 'id'> => ({
  sourceTableId,
  sourceColumnId,
  targetTableId,
  targetColumnId,
  type: type as any
});

/**
 * Validates table data
 */
export const validateTable = (table: Partial<Table>): string[] => {
  const errors: string[] = [];

  if (!table.name?.trim()) {
    errors.push('Table name is required');
  }

  if (!table.columns || table.columns.length === 0) {
    errors.push('Table must have at least one column');
  }

  if (table.columns) {
    const duplicateNames = table.columns
      .filter((col, index, arr) =>
        arr.findIndex(c => c.name === col.name) !== index
      )
      .map(col => col.name);

    if (duplicateNames.length > 0) {
      errors.push(`Duplicate column names: ${duplicateNames.join(', ')}`);
    }

    table.columns.forEach((column, index) => {
      const columnErrors = validateColumn(column);
      columnErrors.forEach(error =>
        errors.push(`Column ${index + 1}: ${error}`)
      );
    });
  }

  return errors;
};

/**
 * Validates column data
 */
export const validateColumn = (column: Partial<Column>): string[] => {
  const errors: string[] = [];

  if (!column.name?.trim()) {
    errors.push('Column name is required');
  }

  if (column.name && !/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(column.name)) {
    errors.push('Column name must be a valid identifier');
  }

  if (column.primaryKey && column.nullable) {
    errors.push('Primary key columns cannot be nullable');
  }

  return errors;
};

/**
 * Validates relationship data
 */
export const validateRelationship = (
  relationship: Partial<Relationship>,
  tables: Table[]
): string[] => {
  const errors: string[] = [];

  if (!relationship.sourceTableId || !relationship.targetTableId) {
    errors.push('Source and target tables are required');
  }

  if (!relationship.sourceColumnId || !relationship.targetColumnId) {
    errors.push('Source and target columns are required');
  }

  if (relationship.sourceTableId === relationship.targetTableId) {
    errors.push('Self-referencing relationships are not supported');
  }

  const sourceTable = tables.find(t => t.id === relationship.sourceTableId);
  const targetTable = tables.find(t => t.id === relationship.targetTableId);

  if (!sourceTable || !targetTable) {
    errors.push('Referenced tables must exist');
  }

  if (sourceTable && !sourceTable.columns.find(c => c.id === relationship.sourceColumnId)) {
    errors.push('Source column must exist');
  }

  if (targetTable && !targetTable.columns.find(c => c.id === relationship.targetColumnId)) {
    errors.push('Target column must exist');
  }

  return errors;
};

/**
 * Duplicates a table with new IDs
 */
export const duplicateTable = (table: Table, offset = { x: 50, y: 50 }): Table => ({
  ...table,
  id: ID_GENERATORS.TABLE(),
  name: `${table.name}_copy`,
  position: {
    x: table.position.x + offset.x,
    y: table.position.y + offset.y
  },
  columns: table.columns.map(column => ({
    ...column,
    id: ID_GENERATORS.COLUMN()
  }))
});

/**
 * Finds relationships connected to a table
 */
export const getTableRelationships = (
  tableId: string,
  relationships: Relationship[]
): Relationship[] => {
  return relationships.filter(
    rel => rel.sourceTableId === tableId || rel.targetTableId === tableId
  );
};

/**
 * Gets all tables connected to a specific table
 */
export const getConnectedTables = (
  tableId: string,
  tables: Table[],
  relationships: Relationship[]
): Table[] => {
  const connectedTableIds = relationships
    .filter(rel => rel.sourceTableId === tableId || rel.targetTableId === tableId)
    .map(rel =>
      rel.sourceTableId === tableId ? rel.targetTableId : rel.sourceTableId
    )
    .filter(id => id !== tableId);

  return tables.filter(table => connectedTableIds.includes(table.id));
};

/**
 * Generates a foreign key object
 */
export const createForeignKey = (
  tableId: string,
  columnId: string,
  onDelete?: ForeignKeyAction,
  onUpdate?: ForeignKeyAction
): ForeignKey => ({
  tableId,
  columnId,
  onDelete,
  onUpdate
});

/**
 * Checks if a column can be used as a foreign key target
 */
export const isValidForeignKeyTarget = (column: Column): boolean => {
  return column.primaryKey || column.unique;
};

/**
 * Sorts columns by importance (primary keys first, then foreign keys, then others)
 */
export const sortColumnsByImportance = (columns: Column[]): Column[] => {
  return [...columns].sort((a, b) => {
    // Primary keys first
    if (a.primaryKey && !b.primaryKey) return -1;
    if (!a.primaryKey && b.primaryKey) return 1;

    // Then foreign keys
    if (a.foreignKey && !b.foreignKey) return -1;
    if (!a.foreignKey && b.foreignKey) return 1;

    // Then by name
    return a.name.localeCompare(b.name);
  });
};