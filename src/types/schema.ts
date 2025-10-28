/**
 * Schema Types - Legacy compatibility file
 * @deprecated Use src/features/schema/types/schema.types.ts instead
 */

import { SQLDialect } from '@/constants/schema';

// Re-export from the new modular types for backward compatibility
export type {
  Column,
  ForeignKey,
  Table,
  Relationship,
  Schema,
  SchemaNode,
  SchemaEdge,
} from '@/features/schema/types/schema.types';

// Re-export types from constants
export type {
  ColumnType,
  RelationshipType,
  SQLDialect,
  ExportFormat
} from '@/constants/schema';

// Re-export interfaces for backward compatibility
export interface ExportOptions {
  format: 'json' | 'sql' | 'prisma' | 'django' | 'laravel' | 'typeorm';
  sqlDialect?: SQLDialect;
  includePositions?: boolean;
  includeDescriptions?: boolean;
}