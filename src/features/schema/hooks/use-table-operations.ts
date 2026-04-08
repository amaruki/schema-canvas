/**
 * Hook for table operations - encapsulates table-related state and logic
 */

import { useCallback, useMemo } from 'react';
import { useSchema } from '@/hooks/use-schema';
import type { Table } from '@/features/schema/types/schema.types';
import { createTable, duplicateTable } from '@/features/schema/utils/schema.utils';
import { ID_GENERATORS } from '@/constants/schema';

export const useTableOperations = () => {
  const addTable = useSchema((s) => s.addTable);
  const updateTable = useSchema((s) => s.updateTable);
  const deleteTable = useSchema((s) => s.deleteTable);
  const tables = useSchema((s) => s.tables);
  const relationships = useSchema((s) => s.relationships);

  /**
   * Creates a new table at specified position
   */
  const createNewTable = useCallback((position?: { x: number; y: number }) => {
    let name = 'New Table';
    let counter = 2;
    while (tables.some(t => t.name === name)) {
      name = `New Table ${counter++}`;
    }
    const newTableData = createTable({
      name,
      position: position || {
        x: Math.random() * 400 + 100,
        y: Math.random() * 300 + 100
      },
      columns: [{
        id: ID_GENERATORS.COLUMN(),
        name: 'id',
        type: 'integer',
        nullable: false,
        primaryKey: true,
        unique: true,
      }]
    });

    addTable(newTableData);
  }, [addTable, tables]);

  /**
   * Duplicates an existing table
   */
  const duplicateExistingTable = useCallback((table: Table) => {
    const duplicatedTable = duplicateTable(table);
    addTable(duplicatedTable);
  }, [addTable]);

  /**
   * Updates table name
   */
  const updateTableName = useCallback((tableId: string, name: string) => {
    if (name.trim() && name.trim() !== name) {
      updateTable(tableId, { name: name.trim() });
    }
  }, [updateTable]);

  /**
   * Updates table position
   */
  const updateTablePosition = useCallback((tableId: string, position: { x: number; y: number }) => {
    updateTable(tableId, { position });
  }, [updateTable]);

  /**
   * Updates table properties
   */
  const updateTableProperties = useCallback((
    tableId: string,
    properties: Partial<Omit<Table, 'id' | 'columns'>>
  ) => {
    updateTable(tableId, properties);
  }, [updateTable]);

  /**
   * Deletes a table and its relationships
   */
  const deleteExistingTable = useCallback((tableId: string) => {
    deleteTable(tableId);
  }, [deleteTable]);

  /**
   * Finds a table by ID
   */
  const findTable = useCallback((tableId: string): Table | undefined => {
    return tables.find(table => table.id === tableId);
  }, [tables]);

  /**
   * Gets tables connected to a specific table
   */
  const getConnectedTables = useCallback((tableId: string): Table[] => {
    const connectedTableIds = relationships
      .filter(rel => rel.sourceTableId === tableId || rel.targetTableId === tableId)
      .map(rel => rel.sourceTableId === tableId ? rel.targetTableId : rel.sourceTableId)
      .filter(id => id !== tableId);

    return tables.filter(table => connectedTableIds.includes(table.id));
  }, [tables, relationships]);

  /**
   * Gets relationships for a specific table
   */
  const getTableRelationships = useCallback((tableId: string) => {
    return relationships.filter(
      rel => rel.sourceTableId === tableId || rel.targetTableId === tableId
    );
  }, [relationships]);

  /**
   * Checks if a table name is unique
   */
  const isTableNameUnique = useCallback((name: string, excludeId?: string): boolean => {
    return !tables.some(table =>
      table.name.toLowerCase() === name.toLowerCase() &&
      table.id !== excludeId
    );
  }, [tables]);

  return useMemo(() => ({
    // Actions
    createNewTable,
    duplicateExistingTable,
    updateTableName,
    updateTablePosition,
    updateTableProperties,
    deleteExistingTable,

    // Queries
    findTable,
    getConnectedTables,
    getTableRelationships,
    isTableNameUnique,

    // Data
    tables,
    relationships
  }), [
    createNewTable, duplicateExistingTable, updateTableName, updateTablePosition, 
    updateTableProperties, deleteExistingTable, findTable, getConnectedTables, 
    getTableRelationships, isTableNameUnique, tables, relationships
  ]);
};