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
interface DbmlToken { start?: { line?: number; column?: number } }
interface DbmlField {
  name: string;
  type: DbmlFieldType;
  pk: boolean;
  not_null: boolean | undefined;
  unique: boolean;
  dbdefault: DbmlDefault | null;
  increment: boolean;
  note: string | { value: string } | null;
  token?: DbmlToken;
}
interface DbmlTable { 
  name: string; 
  alias?: string; 
  headerColor?: string; 
  note?: string | { value: string } | null; 
  fields: DbmlField[];
}
interface DbmlEndpoint { tableName: string; fieldNames: string[]; relation: string }
interface DbmlRef { endpoints: [DbmlEndpoint, DbmlEndpoint]; token?: DbmlToken }
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

function extractNote(note: string | { value: string } | null | undefined): string | undefined {
  if (!note) return undefined;
  if (typeof note === 'string') return note;
  if (typeof note === 'object' && note.value) return note.value;
  return undefined;
}

export function parseDbml(
  text: string,
  existingTables: Table[],
  existingNodes: Node[],
  center?: { x: number; y: number }
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

  // Pass 1: Map exact name matches
  const matchedExistingIds = new Set<string>();
  const tableMatches = schema.tables.map((dbTable) => {
    const existing = existingTables.find((t) => t.name === dbTable.name);
    if (existing) matchedExistingIds.add(existing.id);
    return { dbTable, existing };
  });

  // Pass 2: Heuristic renaming
  // If exactly one table is unmatched in both sets, map it.
  const unmatchedExisting = existingTables.filter(t => !matchedExistingIds.has(t.id));
  const unmatchedDbml = tableMatches.filter(m => !m.existing);
  
  if (unmatchedExisting.length === 1 && unmatchedDbml.length === 1) {
    unmatchedDbml[0].existing = unmatchedExisting[0];
  }

  // To detect inline refs using tokens: capture field token lines
  const fieldLines = new Map<number, { tableId: string; columnId: string }>();

  const tables: Table[] = tableMatches.map(({ dbTable, existing }) => {
    const position = existing?.position ?? findOpenSlot(existingNodes, center ?? { x: 200, y: 200 });
    const tableId = existing?.id ?? `table_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const columns: Column[] = dbTable.fields.map((field) => {
      const colId =
        existing?.columns.find((c) => c.name === field.name)?.id ??
        `col_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const line = field.token?.start?.line;
      if (line !== undefined) {
        fieldLines.set(line, { tableId, columnId: colId });
      }

      return {
        id: colId,
        name: field.name,
        type: mapDbmlType(field.type?.type_name ?? 'string'),
        primaryKey: !!field.pk,
        nullable: !field.not_null && !field.pk,
        unique: !!field.unique,
        defaultValue: field.dbdefault?.value != null ? String(field.dbdefault.value) : undefined,
        increment: !!field.increment,
        note: extractNote(field.note),
      };
    });

    return {
      id: tableId,
      name: dbTable.name,
      alias: dbTable.alias,
      note: extractNote(dbTable.note),
      headerColor: dbTable.headerColor,
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

    // Detect inline if the ref token line matches a field token line
    let isInline = false;
    const refLine = ref.token?.start?.line;
    if (refLine !== undefined) {
      const inlineField = fieldLines.get(refLine);
      if (inlineField) {
        isInline = (inlineField.tableId === src.tableId && inlineField.columnId === src.columnId) || 
                   (inlineField.tableId === tgt.tableId && inlineField.columnId === tgt.columnId);
      } else {
        // Fallback: Check if original text has inline ref
        // by looking at the line in the DBML source string
        const lines = text.split('\n');
        if (lines[refLine - 1] && lines[refLine - 1].includes('ref:')) {
            isInline = true; 
        }
      }
    }

    relationships.push({
      id: `rel_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sourceTableId: src.tableId,
      // Append handle suffixes to match how canvas-created relationships store column IDs
      sourceColumnId: `${src.columnId}-right`,
      targetTableId: tgt.tableId,
      targetColumnId: `${tgt.columnId}-left`,
      type: mapEndpointRelations(ep0.relation, ep1.relation),
      isInline,
    });
  });

  return { tables, relationships, errors: [] };
}
