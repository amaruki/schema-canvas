import { Parser } from '@dbml/core';
import type { Table, Column, Relationship } from '@/features/schema/types/schema.types';
import type { ColumnType, RelationshipType } from '@/constants/schema';
import { findOpenSlot } from '@/lib/layout/smart-placement';
import type { Node } from '@xyflow/react';

export interface ParseError {
  message: string;
  line?: number;
}

export interface ParseResult {
  tables: Table[];
  relationships: Relationship[];
  errors: ParseError[];
}

// Minimal types for @dbml/core v6 AST (no official TS exports)
interface DbmlFieldType { type_name: string }
interface DbmlDefault { value: string | number | boolean | null }
interface DbmlField {
  name: string;
  type: DbmlFieldType;
  pk: boolean;
  not_null: boolean | undefined;
  unique: boolean;
  dbdefault: DbmlDefault | null;
}
interface DbmlTable { name: string; fields: DbmlField[] }
interface DbmlEndpoint { tableName: string; fieldNames: string[]; relation: string }
interface DbmlRef { endpoints: [DbmlEndpoint, DbmlEndpoint] }
interface DbmlSchema { tables: DbmlTable[]; refs: DbmlRef[] }
interface DbmlDatabase { schemas: DbmlSchema[] }
interface DbmlDiag { message: string; location?: { start?: { line?: number } } }
interface DbmlError { diags?: DbmlDiag[]; message?: string }

function mapDbmlType(typeName: string): ColumnType {
  const t = typeName.toLowerCase();
  if (['varchar', 'char', 'nvarchar'].includes(t)) return 'string';
  if (['int', 'integer', 'smallint', 'tinyint'].includes(t)) return 'integer';
  if (t === 'bigint') return 'bigint';
  if (['float', 'real', 'double'].includes(t)) return 'float';
  if (['decimal', 'numeric'].includes(t)) return 'decimal';
  if (['bool', 'boolean'].includes(t)) return 'boolean';
  if (t === 'date') return 'date';
  if (t === 'datetime') return 'datetime';
  if (t === 'timestamp') return 'timestamp';
  if (['json', 'jsonb'].includes(t)) return 'json';
  if (t === 'uuid') return 'uuid';
  if (t === 'text') return 'text';
  return 'string';
}

// @dbml/core stores endpoint.relation as '1' or '*' (not '>' '<' '-' '<>')
function mapEndpointRelations(r0: string, r1: string): RelationshipType {
  if (r0 === '*' && r1 === '1') return 'many-to-one';
  if (r0 === '1' && r1 === '*') return 'one-to-many';
  if (r0 === '1' && r1 === '1') return 'one-to-one';
  if (r0 === '*' && r1 === '*') return 'many-to-many';
  return 'one-to-many';
}

export function parseDbml(
  text: string,
  existingTables: Table[],
  existingNodes: Node[]
): ParseResult {
  if (!text.trim()) return { tables: [], relationships: [], errors: [] };

  let database: DbmlDatabase;
  try {
    database = new Parser().parse(text, 'dbmlv2') as unknown as DbmlDatabase;
  } catch (e: unknown) {
    // @dbml/core v6 throws { diags: [{ message, location }] } instead of a standard Error
    const err = e as DbmlError;
    const diag = err.diags?.[0];
    const msg = diag?.message ?? err.message ?? String(e);
    const line = diag?.location?.start?.line;
    return { tables: [], relationships: [], errors: [{ message: msg, line }] };
  }

  const schema = database.schemas?.[0];
  if (!schema) return { tables: [], relationships: [], errors: [] };

  const tables: Table[] = schema.tables.map((dbTable) => {
    const existing = existingTables.find((t) => t.name === dbTable.name);
    const position = existing?.position ?? findOpenSlot(existingNodes, { x: 200, y: 200 });

    const columns: Column[] = dbTable.fields.map((field) => {
      const colId =
        existing?.columns.find((c) => c.name === field.name)?.id ??
        `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      return {
        id: colId,
        name: field.name,
        type: mapDbmlType(field.type?.type_name ?? 'string'),
        primaryKey: !!field.pk,
        nullable: !field.not_null && !field.pk,
        unique: !!field.unique,
        defaultValue: field.dbdefault?.value != null ? String(field.dbdefault.value) : undefined,
      };
    });

    return {
      id: existing?.id ?? `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: dbTable.name,
      position,
      columns,
    };
  });

  // col lookup: "tableName.fieldName" -> { tableId, columnId }
  const colLookup = new Map<string, { tableId: string; columnId: string }>();
  tables.forEach((table) => {
    table.columns.forEach((col) => {
      colLookup.set(`${table.name}.${col.name}`, { tableId: table.id, columnId: col.id });
    });
  });

  const relationships: Relationship[] = [];
  schema.refs.forEach((ref) => {
    const ep0 = ref.endpoints[0];
    const ep1 = ref.endpoints[1];

    const src = colLookup.get(`${ep0.tableName}.${ep0.fieldNames[0]}`);
    const tgt = colLookup.get(`${ep1.tableName}.${ep1.fieldNames[0]}`);
    if (!src || !tgt) return;

    relationships.push({
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceTableId: src.tableId,
      // Append handle suffixes to match how canvas-created relationships store column IDs
      sourceColumnId: `${src.columnId}-right`,
      targetTableId: tgt.tableId,
      targetColumnId: `${tgt.columnId}-left-target`,
      type: mapEndpointRelations(ep0.relation, ep1.relation),
    });
  });

  return { tables, relationships, errors: [] };
}
