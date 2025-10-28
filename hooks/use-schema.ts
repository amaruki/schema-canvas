import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Table, Relationship, Column, Schema } from '@/types/schema';

interface SchemaState {
  // State
  tables: Table[];
  relationships: Relationship[];
  selectedTableId: string | null;
  selectedRelationshipId: string | null;
  isDirty: boolean;

  // Actions
  addTable: (table: Omit<Table, 'id'>) => void;
  updateTable: (id: string, updates: Partial<Table>) => void;
  deleteTable: (id: string) => void;

  addColumn: (tableId: string, column: Omit<Column, 'id'>) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;

  addRelationship: (relationship: Omit<Relationship, 'id'>) => void;
  updateRelationship: (id: string, updates: Partial<Relationship>) => void;
  deleteRelationship: (id: string) => void;

  setSelectedTable: (id: string | null) => void;
  setSelectedRelationship: (id: string | null) => void;

  loadSchema: (schema: Schema) => void;
  exportSchema: () => Schema;
  clearSchema: () => void;

  setDirty: (dirty: boolean) => void;
}

export const useSchema = create<SchemaState>()(
  devtools(
    (set, get) => ({
      // Initial state
      tables: [],
      relationships: [],
      selectedTableId: null,
      selectedRelationshipId: null,
      isDirty: false,

      // Table actions
      addTable: (tableData) => {
        const newTable: Table = {
          ...tableData,
          id: `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        set((state) => ({
          tables: [...state.tables, newTable],
          isDirty: true,
        }));
      },

      updateTable: (id, updates) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id ? { ...table, ...updates } : table
          ),
          isDirty: true,
        }));
      },

      deleteTable: (id) => {
        set((state) => {
          // Remove relationships associated with this table
          const filteredRelationships = state.relationships.filter(
            (rel) => rel.sourceTableId !== id && rel.targetTableId !== id
          );

          return {
            tables: state.tables.filter((table) => table.id !== id),
            relationships: filteredRelationships,
            selectedTableId: state.selectedTableId === id ? null : state.selectedTableId,
            isDirty: true,
          };
        });
      },

      // Column actions
      addColumn: (tableId, columnData) => {
        const newColumn: Column = {
          ...columnData,
          id: `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId
              ? { ...table, columns: [...table.columns, newColumn] }
              : table
          ),
          isDirty: true,
        }));
      },

      updateColumn: (tableId, columnId, updates) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  columns: table.columns.map((column) =>
                    column.id === columnId ? { ...column, ...updates } : column
                  ),
                }
              : table
          ),
          isDirty: true,
        }));
      },

      deleteColumn: (tableId, columnId) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === tableId
              ? {
                  ...table,
                  columns: table.columns.filter((column) => column.id !== columnId),
                }
              : table
          ),
          isDirty: true,
        }));
      },

      // Relationship actions
      addRelationship: (relationshipData) => {
        const newRelationship: Relationship = {
          ...relationshipData,
          id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };

        set((state) => ({
          relationships: [...state.relationships, newRelationship],
          isDirty: true,
        }));
      },

      updateRelationship: (id, updates) => {
        set((state) => ({
          relationships: state.relationships.map((rel) =>
            rel.id === id ? { ...rel, ...updates } : rel
          ),
          isDirty: true,
        }));
      },

      deleteRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.filter((rel) => rel.id !== id),
          selectedRelationshipId: state.selectedRelationshipId === id ? null : state.selectedRelationshipId,
          isDirty: true,
        }));
      },

      // Selection actions
      setSelectedTable: (id) => {
        set({ selectedTableId: id, selectedRelationshipId: null });
      },

      setSelectedRelationship: (id) => {
        set({ selectedRelationshipId: id, selectedTableId: null });
      },

      // Schema actions
      loadSchema: (schema) => {
        set({
          tables: schema.tables,
          relationships: schema.relationships,
          selectedTableId: null,
          selectedRelationshipId: null,
          isDirty: false,
        });
      },

      exportSchema: () => {
        const state = get();
        return {
          id: `schema_${Date.now()}`,
          name: 'Untitled Schema',
          tables: state.tables,
          relationships: state.relationships,
          createdAt: new Date(),
          updatedAt: new Date(),
          version: 1,
        };
      },

      clearSchema: () => {
        set({
          tables: [],
          relationships: [],
          selectedTableId: null,
          selectedRelationshipId: null,
          isDirty: false,
        });
      },

      setDirty: (dirty) => {
        set({ isDirty: dirty });
      },
    }),
    { name: 'schema-store' }
  )
);