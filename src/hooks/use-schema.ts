import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { Table, Relationship, Column, Schema } from '@/features/schema/types/schema.types';
import {
  apiGetAllSchemas,
  apiGetSchemaById,
  apiCreateSchema,
  apiUpdateSchemaMetadata,
  apiDeleteSchema,
  apiDuplicateSchema,
  apiSaveSchema,
  apiGetVersions,
  apiCreateVersion,
  apiRestoreVersion,
  type SchemaSummary,
  type SchemaVersionSummary,
} from '@/lib/schema-api';

interface SchemaState {
  // State
  tables: Table[];
  relationships: Relationship[];
  selectedTableId: string | null;
  selectedRelationshipId: string | null;
  isDirty: boolean;
  activeSchemaId: string | null;
  activeSchemaName: string;
  schemaList: SchemaSummary[];
  versions: SchemaVersionSummary[];
  isLoading: boolean;

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

  // Multi-schema actions
  loadSchemaList: () => Promise<void>;
  loadActiveSchema: () => Promise<void>;
  createNewSchema: (name: string, description?: string) => Promise<string>;
  switchSchema: (id: string) => Promise<void>;
  deleteActiveSchema: () => Promise<void>;
  duplicateActiveSchema: () => Promise<string>;
  renameActiveSchema: (name: string) => Promise<void>;
  autoSave: () => Promise<void>;
  
  // Versioning actions
  loadVersions: () => Promise<void>;
  saveVersion: (label?: string) => Promise<string>;
  restoreVersion: (versionId: string) => Promise<void>;
}

let saveTimeout: NodeJS.Timeout | null = null;

function scheduleAutoSave(get: () => SchemaState) {
  if (saveTimeout) clearTimeout(saveTimeout);

  saveTimeout = setTimeout(async () => {
    const state = get();
    if (state.isDirty && state.activeSchemaId) {
      await apiSaveSchema({
        id: state.activeSchemaId,
        name: state.activeSchemaName,
        tables: state.tables,
        relationships: state.relationships,
      });
      state.setDirty(false);
    }
  }, 1000);
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
      activeSchemaId: null,
      activeSchemaName: 'Untitled Schema',
      schemaList: [],
      versions: [],
      isLoading: false,

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

        scheduleAutoSave(get);
      },

      updateTable: (id, updates) => {
        set((state) => ({
          tables: state.tables.map((table) =>
            table.id === id ? { ...table, ...updates } : table
          ),
          isDirty: true,
        }));

        scheduleAutoSave(get);
      },

      deleteTable: (id) => {
        set((state) => {
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

        scheduleAutoSave(get);
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

        scheduleAutoSave(get);
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

        scheduleAutoSave(get);
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

        scheduleAutoSave(get);
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

        scheduleAutoSave(get);
      },

      updateRelationship: (id, updates) => {
        set((state) => ({
          relationships: state.relationships.map((rel) =>
            rel.id === id ? { ...rel, ...updates } : rel
          ),
          isDirty: true,
        }));

        scheduleAutoSave(get);
      },

      deleteRelationship: (id) => {
        set((state) => ({
          relationships: state.relationships.filter((rel) => rel.id !== id),
          selectedRelationshipId: state.selectedRelationshipId === id ? null : state.selectedRelationshipId,
          isDirty: true,
        }));

        scheduleAutoSave(get);
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
          id: state.activeSchemaId || `schema_${Date.now()}`,
          name: state.activeSchemaName,
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

      // Multi-schema actions
      loadSchemaList: async () => {
        set({ isLoading: true });
        try {
          const list = await apiGetAllSchemas();
          set({ schemaList: list });
        } finally {
          set({ isLoading: false });
        }
      },

      loadActiveSchema: async () => {
        const state = get();
        if (!state.activeSchemaId) return;

        set({ isLoading: true });
        try {
          const schema = await apiGetSchemaById(state.activeSchemaId);
          if (schema) {
            set({
              tables: schema.tables,
              relationships: schema.relationships,
              activeSchemaName: schema.name,
              selectedTableId: null,
              selectedRelationshipId: null,
              isDirty: false,
            });
            await get().loadVersions();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      createNewSchema: async (name, description) => {
        set({ isLoading: true });
        try {
          const id = await apiCreateSchema(name, description);
          await get().loadSchemaList();
          await get().switchSchema(id);
          return id;
        } finally {
          set({ isLoading: false });
        }
      },

      switchSchema: async (id) => {
        set({ activeSchemaId: id, isLoading: true });
        try {
          const schema = await apiGetSchemaById(id);
          if (schema) {
            set({
              tables: schema.tables,
              relationships: schema.relationships,
              activeSchemaName: schema.name,
              selectedTableId: null,
              selectedRelationshipId: null,
              isDirty: false,
            });
            await get().loadVersions();
          }
        } finally {
          set({ isLoading: false });
        }
      },

      deleteActiveSchema: async () => {
        const state = get();
        if (!state.activeSchemaId) return;

        set({ isLoading: true });
        try {
          await apiDeleteSchema(state.activeSchemaId);
          await get().loadSchemaList();

          const list = await apiGetAllSchemas();
          if (list.length > 0) {
            await get().switchSchema(list[0].id);
          } else {
            set({
              activeSchemaId: null,
              tables: [],
              relationships: [],
              selectedTableId: null,
              selectedRelationshipId: null,
              isDirty: false,
            });
          }
        } finally {
          set({ isLoading: false });
        }
      },

      duplicateActiveSchema: async () => {
        const state = get();
        if (!state.activeSchemaId) throw new Error('No active schema');

        set({ isLoading: true });
        try {
          const newId = await apiDuplicateSchema(state.activeSchemaId);
          await get().loadSchemaList();
          await get().switchSchema(newId);
          return newId;
        } finally {
          set({ isLoading: false });
        }
      },

      renameActiveSchema: async (name) => {
        const state = get();
        if (!state.activeSchemaId) return;

        await apiUpdateSchemaMetadata(state.activeSchemaId, { name });
        set({ activeSchemaName: name });
        await get().loadSchemaList();
      },

      autoSave: async () => {
        const state = get();
        if (state.isDirty && state.activeSchemaId) {
          await apiSaveSchema({
            id: state.activeSchemaId,
            name: state.activeSchemaName,
            tables: state.tables,
            relationships: state.relationships,
          });
          set({ isDirty: false });
        }
      },
      
      // Versioning actions
      loadVersions: async () => {
        const state = get();
        if (!state.activeSchemaId) return;
        
        try {
          const list = await apiGetVersions(state.activeSchemaId);
          set({ versions: list });
        } catch (error) {
          console.error("Failed to load versions", error);
        }
      },
      
      saveVersion: async (label) => {
        const state = get();
        if (!state.activeSchemaId) throw new Error('No active schema');
        
        set({ isLoading: true });
        try {
          // If dirty, save current state first
          if (state.isDirty) {
            await apiSaveSchema({
              id: state.activeSchemaId,
              name: state.activeSchemaName,
              tables: state.tables,
              relationships: state.relationships,
            });
            set({ isDirty: false });
          }
          
          const versionId = await apiCreateVersion(state.activeSchemaId, label);
          await get().loadVersions();
          return versionId;
        } finally {
          set({ isLoading: false });
        }
      },
      
      restoreVersion: async (versionId) => {
        const state = get();
        if (!state.activeSchemaId) throw new Error('No active schema');
        
        set({ isLoading: true });
        try {
          const result = await apiRestoreVersion(state.activeSchemaId, versionId);
          set({
            tables: result.tables,
            relationships: result.relationships,
            isDirty: false,
            selectedTableId: null,
            selectedRelationshipId: null,
          });
          await get().loadVersions();
        } finally {
          set({ isLoading: false });
        }
      },      
    }),
    { name: 'schema-store' }
  )
);