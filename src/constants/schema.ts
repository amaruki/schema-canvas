/**
 * Schema-related constants and enums
 */

export const COLUMN_TYPES = [
  'string',
  'text',
  'integer',
  'bigint',
  'float',
  'decimal',
  'boolean',
  'date',
  'datetime',
  'timestamp',
  'time',
  'json',
  'jsonb',
  'uuid',
  'binary',
  'enum',
  'array'
] as const;

export const RELATIONSHIP_TYPES = [
  'one-to-one',
  'one-to-many',
  'many-to-many',
  'many-to-one',
  'zero-to-one',
  'zero-to-many'
] as const;

export const FOREIGN_KEY_ACTIONS = [
  'CASCADE',
  'SET NULL',
  'RESTRICT',
  'NO ACTION'
] as const;

export const SQL_DIALECTS = [
  'postgresql',
  'mysql',
  'sqlite',
  'sqlserver'
] as const;

export const EXPORT_FORMATS = [
  'json',
  'sql',
  'prisma',
  'django',
  'laravel',
  'typeorm'
] as const;

export const DEFAULT_COLUMN: ColumnDefaults = {
  name: '',
  type: 'string',
  nullable: true,
  primaryKey: false,
  unique: false
};

export const DEFAULT_TABLE: TableDefaults = {
  name: 'New Table',
  position: { x: 0, y: 0 },
  columns: []
};

export const ID_GENERATORS = {
  TABLE: () => `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  COLUMN: () => `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  RELATIONSHIP: () => `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
  SCHEMA: () => `schema_${Date.now()}`
} as const;

// Types
export type ColumnType = typeof COLUMN_TYPES[number];
export type RelationshipType = typeof RELATIONSHIP_TYPES[number];
export type ForeignKeyAction = typeof FOREIGN_KEY_ACTIONS[number];
export type SQLDialect = typeof SQL_DIALECTS[number];
export type ExportFormat = typeof EXPORT_FORMATS[number];

interface ColumnDefaults {
  name: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
}

interface TableDefaults {
  name: string;
  position: { x: number; y: number };
  columns: any[];
}