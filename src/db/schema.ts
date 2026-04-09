import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

export const schemas = sqliteTable('schemas', {
  id: text('id').primaryKey(),
  name: text('name').notNull().default('Untitled Schema'),
  description: text('description'),
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  updatedAt: text('updated_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
  version: integer('version').notNull().default(1),
});

export const schemaVersions = sqliteTable('schema_versions', {
  id: text('id').primaryKey(),
  schemaId: text('schema_id').notNull().references(() => schemas.id, { onDelete: 'cascade' }),
  versionNumber: integer('version_number').notNull(),
  label: text('label'),
  snapshot: text('snapshot').notNull(), // Stored as JSON string
  createdAt: text('created_at').notNull().default(sql`(CURRENT_TIMESTAMP)`),
});

export const tables = sqliteTable('tables', {
  id: text('id').primaryKey(),
  schemaId: text('schema_id').notNull().references(() => schemas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  alias: text('alias'),
  note: text('note'),
  headerColor: text('header_color'),
  positionX: real('position_x').notNull().default(0),
  positionY: real('position_y').notNull().default(0),
  description: text('description'),
  color: text('color'),
});

export const columns = sqliteTable('columns', {
  id: text('id').primaryKey(),
  tableId: text('table_id').notNull().references(() => tables.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type').notNull(),
  nullable: integer('nullable', { mode: 'boolean' }).notNull().default(false),
  primaryKey: integer('primary_key', { mode: 'boolean' }).notNull().default(false),
  unique: integer('unique', { mode: 'boolean' }).notNull().default(false),
  defaultValue: text('default_value'),
  note: text('note'),
  increment: integer('increment', { mode: 'boolean' }),
  description: text('description'),
  foreignKeyTableId: text('foreign_key_table_id'),
  foreignKeyColumnId: text('foreign_key_column_id'),
  foreignKeyOnDelete: text('foreign_key_on_delete'),
  foreignKeyOnUpdate: text('foreign_key_on_update'),
});

export const relationships = sqliteTable('relationships', {
  id: text('id').primaryKey(),
  schemaId: text('schema_id').notNull().references(() => schemas.id, { onDelete: 'cascade' }),
  sourceTableId: text('source_table_id').notNull(),
  sourceColumnId: text('source_column_id').notNull(),
  targetTableId: text('target_table_id').notNull(),
  targetColumnId: text('target_column_id').notNull(),
  type: text('type').notNull(),
  isInline: integer('is_inline', { mode: 'boolean' }),
  name: text('name'),
  onDelete: text('on_delete'),
  onUpdate: text('on_update'),
});
