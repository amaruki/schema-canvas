import { Schema, Table, Relationship, Column } from '@/types/schema';

export function exportToJSON(schema: Schema, includePositions = true): string {
  const exportData = {
    version: '1.0.0',
    metadata: {
      name: schema.name,
      description: schema.description,
      createdAt: schema.createdAt,
      updatedAt: schema.updatedAt,
      exportedAt: new Date().toISOString(),
    },
    tables: schema.tables.map(table => ({
      id: table.id,
      name: table.name,
      description: table.description,
      ...(includePositions && { position: table.position }),
      columns: table.columns.map(column => ({
        id: column.id,
        name: column.name,
        type: column.type,
        nullable: column.nullable,
        primaryKey: column.primaryKey,
        unique: column.unique,
        defaultValue: column.defaultValue,
        description: column.description,
        ...(column.foreignKey && {
          foreignKey: {
            tableId: column.foreignKey.tableId,
            columnId: column.foreignKey.columnId,
            onDelete: column.foreignKey.onDelete,
            onUpdate: column.foreignKey.onUpdate,
          }
        }),
      })),
    })),
    relationships: schema.relationships.map(relationship => ({
      id: relationship.id,
      name: relationship.name,
      sourceTableId: relationship.sourceTableId,
      sourceColumnId: relationship.sourceColumnId,
      targetTableId: relationship.targetTableId,
      targetColumnId: relationship.targetColumnId,
      type: relationship.type,
      onDelete: relationship.onDelete,
      onUpdate: relationship.onUpdate,
    })),
  };

  return JSON.stringify(exportData, null, 2);
}

export function importFromJSON(jsonString: string): Schema {
  try {
    const data = JSON.parse(jsonString);

    if (!data.tables || !Array.isArray(data.tables)) {
      throw new Error('Invalid JSON format: missing tables array');
    }

    const tables: Table[] = data.tables.map((table: any) => ({
      id: table.id,
      name: table.name,
      position: table.position || { x: 0, y: 0 },
      description: table.description,
      columns: table.columns.map((column: any) => ({
        id: column.id,
        name: column.name,
        type: column.type,
        nullable: column.nullable,
        primaryKey: column.primaryKey,
        unique: column.unique,
        defaultValue: column.defaultValue,
        description: column.description,
        foreignKey: column.foreignKey ? {
          tableId: column.foreignKey.tableId,
          columnId: column.foreignKey.columnId,
          onDelete: column.foreignKey.onDelete,
          onUpdate: column.foreignKey.onUpdate,
        } : undefined,
      })),
    }));

    const relationships: Relationship[] = (data.relationships || []).map((rel: any) => ({
      id: rel.id,
      name: rel.name,
      sourceTableId: rel.sourceTableId,
      sourceColumnId: rel.sourceColumnId,
      targetTableId: rel.targetTableId,
      targetColumnId: rel.targetColumnId,
      type: rel.type,
      onDelete: rel.onDelete,
      onUpdate: rel.onUpdate,
    }));

    return {
      id: data.metadata?.name || 'Imported Schema',
      name: data.metadata?.name || 'Imported Schema',
      description: data.metadata?.description,
      tables,
      relationships,
      createdAt: data.metadata?.createdAt ? new Date(data.metadata.createdAt) : new Date(),
      updatedAt: data.metadata?.updatedAt ? new Date(data.metadata.updatedAt) : new Date(),
      version: data.version || 1,
    };
  } catch (error) {
    throw new Error(`Failed to import JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}