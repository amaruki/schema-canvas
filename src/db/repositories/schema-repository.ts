import { eq, and, desc, inArray } from "drizzle-orm";
import {
  db,
  schemas,
  tables,
  columns,
  relationships,
  schemaVersions,
} from "@/db";
import type {
  Table,
  Relationship,
  Schema,
} from "@/features/schema/types/schema.types";

export interface SchemaSummary {
  id: string;
  name: string;
  description: string | null;
  tableCount: number;
  relationshipCount: number;
  updatedAt: string;
}

export async function getAllSchemas(userId: string): Promise<SchemaSummary[]> {
  const allSchemas = await db
    .select()
    .from(schemas)
    .where(eq(schemas.userId, userId))
    .orderBy(schemas.updatedAt);

  const result: SchemaSummary[] = [];

  for (const s of allSchemas) {
    const tableCount = await db
      .select({ count: tables.id })
      .from(tables)
      .where(eq(tables.schemaId, s.id));

    const relationshipCount = await db
      .select({ count: relationships.id })
      .from(relationships)
      .where(eq(relationships.schemaId, s.id));

    result.push({
      id: s.id,
      name: s.name,
      description: s.description,
      tableCount: tableCount.length,
      relationshipCount: relationshipCount.length,
      updatedAt:
        s.updatedAt instanceof Date ? s.updatedAt.toISOString() : s.updatedAt,
    });
  }

  return result;
}

export async function getSchemaById(
  id: string,
  userId?: string,
): Promise<Schema | null> {
  const whereClause = userId
    ? and(eq(schemas.id, id), eq(schemas.userId, userId))
    : eq(schemas.id, id);

  const schemaResult = await db
    .select()
    .from(schemas)
    .where(whereClause)
    .limit(1);

  if (schemaResult.length === 0) return null;

  const schemaRecord = schemaResult[0];

  const tableRecords = await db
    .select()
    .from(tables)
    .where(eq(tables.schemaId, id));

  const columnRecords = await db
    .select()
    .from(columns)
    .innerJoin(tables, eq(columns.tableId, tables.id))
    .where(eq(tables.schemaId, id));

  const relationshipRecords = await db
    .select()
    .from(relationships)
    .where(eq(relationships.schemaId, id));

  const tablesWithColumns: Table[] = tableRecords.map((table) => ({
    id: table.id,
    name: table.name,
    alias: table.alias || undefined,
    note: table.note || undefined,
    headerColor: table.headerColor || undefined,
    position: { x: table.positionX, y: table.positionY },
    columns: columnRecords
      .filter((c) => c.tables.id === table.id)
      .map((c) => ({
        id: c.columns.id,
        name: c.columns.name,
        type: c.columns.type as any,
        nullable: c.columns.nullable,
        primaryKey: c.columns.primaryKey,
        unique: c.columns.unique,
        defaultValue: c.columns.defaultValue || undefined,
        note: c.columns.note || undefined,
        increment: c.columns.increment || undefined,
        description: c.columns.description || undefined,
        foreignKey: c.columns.foreignKeyTableId
          ? {
              tableId: c.columns.foreignKeyTableId,
              columnId: c.columns.foreignKeyColumnId!,
              onDelete: (c.columns.foreignKeyOnDelete as any) || undefined,
              onUpdate: (c.columns.foreignKeyOnUpdate as any) || undefined,
            }
          : undefined,
      })),
    description: table.description || undefined,
    color: table.color || undefined,
  }));

  const dbRelationships: Relationship[] = relationshipRecords.map((rel) => ({
    id: rel.id,
    sourceTableId: rel.sourceTableId,
    sourceColumnId: rel.sourceColumnId,
    targetTableId: rel.targetTableId,
    targetColumnId: rel.targetColumnId,
    type: rel.type as any,
    isInline: rel.isInline || undefined,
    name: rel.name || undefined,
    onDelete: rel.onDelete as any,
    onUpdate: rel.onUpdate as any,
  }));

  return {
    id: schemaRecord.id,
    name: schemaRecord.name,
    description: schemaRecord.description || undefined,
    tables: tablesWithColumns,
    relationships: dbRelationships,
    createdAt: new Date(schemaRecord.createdAt),
    updatedAt: new Date(schemaRecord.updatedAt),
    version: schemaRecord.version,
  };
}

export async function createSchema(
  userId: string,
  name: string,
  description?: string,
): Promise<string> {
  const id = `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.insert(schemas).values({
    id,
    userId,
    name,
    description: description || null,
  });

  return id;
}

export async function updateSchemaMetadata(
  id: string,
  userId: string,
  updates: { name?: string; description?: string },
): Promise<void> {
  const result = await db
    .update(schemas)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(and(eq(schemas.id, id), eq(schemas.userId, userId)));

  if (result.rowCount === 0)
    throw new Error("Schema not found or access denied");
}

export async function deleteSchema(id: string, userId: string): Promise<void> {
  const result = await db
    .delete(schemas)
    .where(and(eq(schemas.id, id), eq(schemas.userId, userId)));

  if (result.rowCount === 0)
    throw new Error("Schema not found or access denied");
}

export async function duplicateSchema(
  id: string,
  userId: string,
): Promise<string> {
  const source = await getSchemaById(id, userId);
  if (!source) throw new Error("Schema not found or access denied");

  const newId = await createSchema(
    userId,
    `${source.name} (Copy)`,
    source.description,
  );

  await saveSchema({
    id: newId,
    userId,
    name: source.name,
    tables: source.tables,
    relationships: source.relationships,
  });

  return newId;
}

export async function saveSchema(schema: {
  id: string;
  userId: string;
  name: string;
  description?: string;
  tables: Table[];
  relationships: Relationship[];
}): Promise<void> {
  await db.transaction(async (tx) => {
    // Insert with userId, or update if exists
    await tx
      .insert(schemas)
      .values({
        id: schema.id,
        userId: schema.userId,
        name: schema.name,
        description: schema.description || null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schemas.id,
        set: {
          name: schema.name,
          description: schema.description || null,
          updatedAt: new Date(),
        },
      });

    // Delete existing tables and relationships for this schema
    await tx.delete(relationships).where(eq(relationships.schemaId, schema.id));
    await tx.delete(tables).where(eq(tables.schemaId, schema.id));

    // Insert tables
    for (const table of schema.tables) {
      await tx.insert(tables).values({
        id: table.id,
        schemaId: schema.id,
        name: table.name,
        alias: table.alias || null,
        note: table.note || null,
        headerColor: table.headerColor || null,
        positionX: table.position.x,
        positionY: table.position.y,
        description: table.description || null,
        color: table.color || null,
      });

      // Insert columns
      for (const column of table.columns) {
        await tx.insert(columns).values({
          id: column.id,
          tableId: table.id,
          name: column.name,
          type: column.type,
          nullable: column.nullable,
          primaryKey: column.primaryKey,
          unique: column.unique,
          defaultValue: column.defaultValue || null,
          note: column.note || null,
          increment: column.increment || null,
          description: column.description || null,
          foreignKeyTableId: column.foreignKey?.tableId || null,
          foreignKeyColumnId: column.foreignKey?.columnId || null,
          foreignKeyOnDelete: column.foreignKey?.onDelete || null,
          foreignKeyOnUpdate: column.foreignKey?.onUpdate || null,
        });
      }
    }

    // Insert relationships
    for (const rel of schema.relationships) {
      await tx.insert(relationships).values({
        id: rel.id,
        schemaId: schema.id,
        sourceTableId: rel.sourceTableId,
        sourceColumnId: rel.sourceColumnId,
        targetTableId: rel.targetTableId,
        targetColumnId: rel.targetColumnId,
        type: rel.type,
        isInline: rel.isInline || null,
        name: rel.name || null,
        onDelete: rel.onDelete || null,
        onUpdate: rel.onUpdate || null,
      });
    }
  });
}

// --- VERSIONING ---

export interface SchemaVersionSummary {
  id: string;
  versionNumber: number;
  label: string | null;
  createdAt: string;
}

export async function getVersions(
  schemaId: string,
  userId: string,
): Promise<SchemaVersionSummary[]> {
  // Verify schema ownership first
  const schemaCheck = await db
    .select({ id: schemas.id })
    .from(schemas)
    .where(and(eq(schemas.id, schemaId), eq(schemas.userId, userId)))
    .limit(1);

  if (schemaCheck.length === 0)
    throw new Error("Schema not found or access denied");

  const versions = await db
    .select({
      id: schemaVersions.id,
      versionNumber: schemaVersions.versionNumber,
      label: schemaVersions.label,
      createdAt: schemaVersions.createdAt,
    })
    .from(schemaVersions)
    .where(eq(schemaVersions.schemaId, schemaId))
    .orderBy(desc(schemaVersions.versionNumber));

  return versions.map((v) => ({
    ...v,
    createdAt:
      v.createdAt instanceof Date ? v.createdAt.toISOString() : v.createdAt,
  }));
}

export async function getVersionById(
  versionId: string,
  userId: string,
): Promise<{ snapshot: string } | null> {
  // Verify ownership through schema
  const result = await db
    .select({
      snapshot: schemaVersions.snapshot,
      schemaId: schemaVersions.schemaId,
    })
    .from(schemaVersions)
    .innerJoin(schemas, eq(schemaVersions.schemaId, schemas.id))
    .where(and(eq(schemaVersions.id, versionId), eq(schemas.userId, userId)))
    .limit(1);

  if (result.length === 0) return null;
  return result[0];
}

export async function createVersion(
  schemaId: string,
  userId: string,
  label?: string,
): Promise<string> {
  const schema = await getSchemaById(schemaId, userId);
  if (!schema) throw new Error("Schema not found or access denied");

  const snapshot = JSON.stringify({
    tables: schema.tables,
    relationships: schema.relationships,
  });

  const latestVersion = await db
    .select({ versionNumber: schemaVersions.versionNumber })
    .from(schemaVersions)
    .where(eq(schemaVersions.schemaId, schemaId))
    .orderBy(desc(schemaVersions.versionNumber))
    .limit(1);

  const nextVersionNumber =
    latestVersion.length > 0 ? latestVersion[0].versionNumber + 1 : 1;
  const newId = `version_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  await db.transaction(async (tx) => {
    await tx.insert(schemaVersions).values({
      id: newId,
      schemaId,
      versionNumber: nextVersionNumber,
      label: label || `Version ${nextVersionNumber}`,
      snapshot,
    });

    // Enforce max 50 versions
    const allVersions = await tx
      .select({ id: schemaVersions.id })
      .from(schemaVersions)
      .where(eq(schemaVersions.schemaId, schemaId))
      .orderBy(desc(schemaVersions.versionNumber));

    if (allVersions.length > 50) {
      const toDelete = allVersions.slice(50).map((v) => v.id);
      if (toDelete.length > 0) {
        await tx
          .delete(schemaVersions)
          .where(inArray(schemaVersions.id, toDelete));
      }
    }
  });

  return newId;
}
