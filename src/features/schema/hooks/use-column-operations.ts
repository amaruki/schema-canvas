/**
 * Hook for column operations - encapsulates column-related state and logic
 */

import { useCallback } from 'react';
import { useSchema } from '@/hooks/use-schema';
import type { Column, Table } from '@/features/schema/types/schema.types';
import { createColumn, validateColumn } from '@/features/schema/utils/schema.utils';
import { ID_GENERATORS } from '@/constants/schema';

export const useColumnOperations = () => {
  const {
    addColumn,
    updateColumn,
    deleteColumn,
    tables
  } = useSchema();

  /**
   * Creates a new column in a table
   */
  const createNewColumn = useCallback((
    tableId: string,
    columnData?: Partial<Column>
  ) => {
    const newColumnData = createColumn(columnData);
    addColumn(tableId, newColumnData);
  }, [addColumn]);

  /**
   * Updates column properties
   */
  const updateColumnProperties = useCallback((
    tableId: string,
    columnId: string,
    properties: Partial<Column>
  ) => {
    updateColumn(tableId, columnId, properties);
  }, [updateColumn]);

  /**
   * Updates column name
   */
  const updateColumnName = useCallback((
    tableId: string,
    columnId: string,
    name: string
  ) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    // Check for duplicate names in the same table
    const isDuplicate = table.columns.some(
      col => col.id !== columnId && col.name.toLowerCase() === name.toLowerCase()
    );

    if (!isDuplicate && name.trim()) {
      updateColumn(tableId, columnId, { name: name.trim() });
    }
  }, [updateColumn, tables]);

  /**
   * Updates column type
   */
  const updateColumnType = useCallback((
    tableId: string,
    columnId: string,
    type: string
  ) => {
    updateColumn(tableId, columnId, { type: type as any });
  }, [updateColumn]);

  /**
   * Toggles column nullable property
   */
  const toggleColumnNullable = useCallback((
    tableId: string,
    columnId: string
  ) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const column = table.columns.find(c => c.id === columnId);
    if (!column) return;

    // Primary keys cannot be nullable
    if (column.primaryKey) return;

    updateColumn(tableId, columnId, { nullable: !column.nullable });
  }, [updateColumn, tables]);

  /**
   * Toggles column primary key property
   */
  const toggleColumnPrimaryKey = useCallback((
    tableId: string,
    columnId: string
  ) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const column = table.columns.find(c => c.id === columnId);
    if (!column) return;

    // If setting as primary key, remove primary key from other columns
    const updates: Partial<Column> = { primaryKey: !column.primaryKey };

    if (!column.primaryKey) {
      updates.nullable = false;
      updates.unique = true;

      // Remove primary key from other columns in the table
      table.columns.forEach(col => {
        if (col.id !== columnId && col.primaryKey) {
          updateColumn(tableId, col.id, {
            primaryKey: false,
            nullable: true,
            unique: false
          });
        }
      });
    }

    updateColumn(tableId, columnId, updates);
  }, [updateColumn, tables]);

  /**
   * Toggles column unique property
   */
  const toggleColumnUnique = useCallback((
    tableId: string,
    columnId: string
  ) => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return;

    const column = table.columns.find(c => c.id === columnId);
    if (!column) return;

    // Primary keys are already unique
    if (column.primaryKey) return;

    updateColumn(tableId, columnId, { unique: !column.unique });
  }, [updateColumn, tables]);

  /**
   * Updates column default value
   */
  const updateColumnDefaultValue = useCallback((
    tableId: string,
    columnId: string,
    defaultValue?: string
  ) => {
    updateColumn(tableId, columnId, { defaultValue });
  }, [updateColumn]);

  /**
   * Updates column description
   */
  const updateColumnDescription = useCallback((
    tableId: string,
    columnId: string,
    description?: string
  ) => {
    updateColumn(tableId, columnId, { description });
  }, [updateColumn]);

  /**
   * Deletes a column
   */
  const deleteExistingColumn = useCallback((
    tableId: string,
    columnId: string
  ) => {
    deleteColumn(tableId, columnId);
  }, [deleteColumn]);

  /**
   * Validates column data
   */
  const validateColumnData = useCallback((column: Partial<Column>): string[] => {
    return validateColumn(column);
  }, []);

  /**
   * Checks if column name is unique within a table
   */
  const isColumnNameUnique = useCallback((
    tableId: string,
    name: string,
    excludeId?: string
  ): boolean => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return false;

    return !table.columns.some(
      col => col.id !== excludeId && col.name.toLowerCase() === name.toLowerCase()
    );
  }, [tables]);

  /**
   * Finds a column by table and column ID
   */
  const findColumn = useCallback((
    tableId: string,
    columnId: string
  ): { table: Table; column: Column } | undefined => {
    const table = tables.find(t => t.id === tableId);
    if (!table) return undefined;

    const column = table.columns.find(c => c.id === columnId);
    if (!column) return undefined;

    return { table, column };
  }, [tables]);

  return {
    // Actions
    createNewColumn,
    updateColumnProperties,
    updateColumnName,
    updateColumnType,
    toggleColumnNullable,
    toggleColumnPrimaryKey,
    toggleColumnUnique,
    updateColumnDefaultValue,
    updateColumnDescription,
    deleteExistingColumn,

    // Validation
    validateColumnData,
    isColumnNameUnique,

    // Queries
    findColumn
  };
};