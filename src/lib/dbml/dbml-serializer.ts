import type { Table, Relationship } from '@/features/schema/types/schema.types';
import type { RelationshipType } from '@/constants/schema';

// Returns the DBML ref symbol such that the roundtrip with the parser is consistent.
// @dbml/core stores endpoint.relation as '1' or '*':
//   '<' -> ep0='1', ep1='*'  (source is one, target is many)
//   '>' -> ep0='*', ep1='1'  (source is many, target is one)
//   '-' -> ep0='1', ep1='1'
//   '<>' -> ep0='*', ep1='*'
function refNotation(type: RelationshipType): string {
  switch (type) {
    case 'one-to-many': return '<';
    case 'many-to-one': return '>';
    case 'one-to-one': return '-';
    case 'many-to-many': return '<>';
    case 'zero-to-one': return '-';
    case 'zero-to-many': return '<';
    default: return '>';
  }
}

function columnConstraints(col: {
  primaryKey: boolean;
  nullable: boolean;
  unique: boolean;
  defaultValue?: string;
}): string {
  const parts: string[] = [];
  if (col.primaryKey) parts.push('pk');
  if (!col.nullable && !col.primaryKey) parts.push('not null');
  if (col.unique && !col.primaryKey) parts.push('unique');
  if (col.defaultValue != null) parts.push(`default: '${col.defaultValue}'`);
  return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
}

export function serializeToDbml(tables: Table[], relationships: Relationship[]): string {
  if (tables.length === 0) return '';

  const tableIdToName = new Map(tables.map((t) => [t.id, t.name]));
  const colIdToName = new Map<string, string>();
  tables.forEach((t) => t.columns.forEach((c) => colIdToName.set(c.id, c.name)));

  const tableBlocks = tables.map((table) => {
    const cols = table.columns.map((col) => {
      return `  ${col.name} ${col.type}${columnConstraints(col)}`;
    });
    return `Table ${table.name} {\n${cols.join('\n')}\n}`;
  });

  const refBlocks: string[] = [];
  relationships.forEach((rel) => {
    const srcTable = tableIdToName.get(rel.sourceTableId);
    const srcCol = colIdToName.get(rel.sourceColumnId);
    const tgtTable = tableIdToName.get(rel.targetTableId);
    const tgtCol = colIdToName.get(rel.targetColumnId);
    if (!srcTable || !srcCol || !tgtTable || !tgtCol) return;
    refBlocks.push(
      `Ref: ${srcTable}.${srcCol} ${refNotation(rel.type)} ${tgtTable}.${tgtCol}`
    );
  });

  const parts = [...tableBlocks];
  if (refBlocks.length > 0) parts.push('', ...refBlocks);
  return parts.join('\n\n');
}
