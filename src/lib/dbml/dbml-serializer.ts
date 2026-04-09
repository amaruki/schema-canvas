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

function columnConstraints(
  col: {
    primaryKey: boolean;
    nullable: boolean;
    unique: boolean;
    defaultValue?: string;
    increment?: boolean;
    note?: string;
  },
  inlineRefs?: string[]
): string {
  const parts: string[] = [];
  if (col.primaryKey) parts.push('pk');
  if (col.increment) parts.push('increment');
  if (!col.nullable && !col.primaryKey) parts.push('not null');
  if (col.unique && !col.primaryKey) parts.push('unique');
  if (col.defaultValue != null) parts.push(`default: '${col.defaultValue}'`);
  if (col.note) parts.push(`note: '${col.note.replace(/'/g, "\\'")}'`);
  if (inlineRefs && inlineRefs.length > 0) {
    inlineRefs.forEach(r => parts.push(`ref: ${r}`));
  }
  return parts.length > 0 ? ` [${parts.join(', ')}]` : '';
}

// Quote identifiers that contain spaces or special characters
function q(name: string): string {
  return /[^a-zA-Z0-9_]/.test(name) ? `"${name}"` : name;
}

// Strip React Flow handle suffixes to get the base column ID
function stripHandleSuffix(id: string): string {
  return id
    .replace(/-left-target$/, '')
    .replace(/-right-target$/, '')
    .replace(/-left$/, '')
    .replace(/-right$/, '');
}

export function serializeToDbml(tables: Table[], relationships: Relationship[]): string {
  if (tables.length === 0) return '';

  const tableIdToName = new Map(tables.map((t) => [t.id, t.name]));
  const colIdToName = new Map<string, string>();
  tables.forEach((t) => t.columns.forEach((c) => colIdToName.set(c.id, c.name)));

  const drawnInlineRefIds = new Set<string>();

  // Pre-calculate inline refs per table and column
  const inlineRefsByTable = new Map<string, Map<string, string[]>>();
  tables.forEach(t => inlineRefsByTable.set(t.id, new Map()));

  relationships.forEach(rel => {
    if (!rel.isInline || drawnInlineRefIds.has(rel.id)) return;
    
    const srcTable = tables.find(t => t.id === rel.sourceTableId);
    const tgtTable = tables.find(t => t.id === rel.targetTableId);
    if (!srcTable || !tgtTable) return;
    
    const srcCol = srcTable.columns.find(c => c.id === stripHandleSuffix(rel.sourceColumnId));
    const tgtCol = tgtTable.columns.find(c => c.id === stripHandleSuffix(rel.targetColumnId));
    if (!srcCol || !tgtCol) return;

    // Prefer attaching to the column that does NOT have the [pk] constraint,
    // or fallback to source table.
    let attachToSrc = true;
    if (tgtCol.primaryKey && !srcCol.primaryKey) {
        attachToSrc = true;  // Source is FK, Target is PK
    } else if (srcCol.primaryKey && !tgtCol.primaryKey) {
        attachToSrc = false; // Source is PK, Target is FK
    } else {
        // If neither or both are PK, we prefer the "Many" side.
        // rel.type = 'one-to-many' -> source is One, target is Many. Attach to Target.
        // rel.type = 'many-to-one' -> source is Many, target is One. Attach to Source.
        if (rel.type === 'one-to-many') attachToSrc = false;
        else if (rel.type === 'many-to-one') attachToSrc = true;
        else attachToSrc = true; // Default to source
    }

    if (attachToSrc) {
        const refs = inlineRefsByTable.get(srcTable.id);
        if (refs) {
          const arr = refs.get(srcCol.id) || [];
          arr.push(`${refNotation(rel.type)} ${q(tgtTable.name)}.${q(tgtCol.name)}`);
          refs.set(srcCol.id, arr);
          drawnInlineRefIds.add(rel.id);
        }
    } else {
        const refs = inlineRefsByTable.get(tgtTable.id);
        if (refs) {
          const arr = refs.get(tgtCol.id) || [];
          
          let revType = '>';
          if (rel.type === 'one-to-many') revType = '>';
          else if (rel.type === 'many-to-one') revType = '<';
          else if (rel.type === 'one-to-one') revType = '-';
          else if (rel.type === 'many-to-many') revType = '<>';
          
          arr.push(`${revType} ${q(srcTable.name)}.${q(srcCol.name)}`);
          refs.set(tgtCol.id, arr);
          drawnInlineRefIds.add(rel.id);
        }
    }
  });

  const tableBlocks = tables.map((table) => {
    const inlineRefs = inlineRefsByTable.get(table.id)!;

    const cols = table.columns.map((col) => {
      return `  ${q(col.name)} ${col.type}${columnConstraints(col, inlineRefs.get(col.id))}`;
    });

    const aliasStr = table.alias ? ` as ${q(table.alias)}` : '';
    
    // Table properties
    const tableProps: string[] = [];
    if (table.headerColor) tableProps.push(`headercolor: ${table.headerColor}`);
    if (table.note) tableProps.push(`note: '${table.note.replace(/'/g, "\\'")}'`);
    const propsStr = tableProps.length > 0 ? ` [${tableProps.join(', ')}]` : '';

    return `Table ${q(table.name)}${aliasStr}${propsStr} {\n${cols.join('\n')}\n}`;
  });

  const refBlocks: string[] = [];
  relationships.forEach((rel) => {
    if (drawnInlineRefIds.has(rel.id)) return;
    
    const srcTable = tableIdToName.get(rel.sourceTableId);
    const srcCol = colIdToName.get(stripHandleSuffix(rel.sourceColumnId));
    const tgtTable = tableIdToName.get(rel.targetTableId);
    const tgtCol = colIdToName.get(stripHandleSuffix(rel.targetColumnId));
    if (!srcTable || !srcCol || !tgtTable || !tgtCol) return;
    refBlocks.push(
      `Ref: ${q(srcTable)}.${q(srcCol)} ${refNotation(rel.type)} ${q(tgtTable)}.${q(tgtCol)}`
    );
  });

  const parts = [...tableBlocks];
  if (refBlocks.length > 0) parts.push('', ...refBlocks);
  return parts.join('\n\n');
}
