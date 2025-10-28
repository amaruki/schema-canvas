import { Schema, Table, Column, Relationship } from '@/types/schema';

function mapPrismaType(type: string): string {
  const typeMap: Record<string, string> = {
    'string': 'String',
    'text': 'String',
    'integer': 'Int',
    'bigint': 'BigInt',
    'float': 'Float',
    'decimal': 'Decimal',
    'boolean': 'Boolean',
    'date': 'DateTime',
    'datetime': 'DateTime',
    'timestamp': 'DateTime',
    'time': 'DateTime',
    'json': 'Json',
    'jsonb': 'Json',
    'uuid': 'String',
    'binary': 'Bytes',
    'enum': 'String', // Would need custom enum type
    'array': 'Json', // Prisma doesn't have arrays in SQLite
  };

  return typeMap[type] || 'String';
}

function formatPrismaFieldName(name: string): string {
  // Convert snake_case to camelCase
  return name.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

function formatPrismaModelName(name: string): string {
  // Convert table name to PascalCase
  return name
    .split(/[_\s-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

export function exportToPrisma(schema: Schema): string {
  const lines: string[] = [];

  // Add header
  lines.push('// This is your Prisma schema file,');
  lines.push('// learn more about it in the docs: https://pris.ly/d/prisma-schema');
  lines.push('');
  lines.push(`generator client {`);
  lines.push(`  provider = "prisma-client-js"`);
  lines.push(`}`);
  lines.push('');
  lines.push(`datasource db {`);
  lines.push(`  provider = "postgresql" // Change this to your database provider`);
  lines.push(`  url      = env("DATABASE_URL")`);
  lines.push(`}`);
  lines.push('');

  // Generate models
  for (const table of schema.tables) {
    const modelName = formatPrismaModelName(table.name);

    lines.push(`model ${modelName} {`);

    // Add columns
    for (const column of table.columns) {
      const fieldName = formatPrismaFieldName(column.name);
      const prismaType = mapPrismaType(column.type);

      let fieldDef = `  ${fieldName} ${prismaType}`;

      // Add modifiers
      const modifiers: string[] = [];

      if (!column.nullable) {
        if (column.type.includes('timestamp') && !column.defaultValue) {
          modifiers.push('@default(now())');
        }
      } else {
        fieldDef += '?';
      }

      if (column.primaryKey) {
        if (table.columns.filter(c => c.primaryKey).length === 1) {
          modifiers.push('@id');
        }
      }

      if (column.unique) {
        modifiers.push('@unique');
      }

      if (column.defaultValue) {
        if (column.defaultValue.toLowerCase() === 'uuid_generate_v4()') {
          modifiers.push('@default(uuid())');
        } else if (column.defaultValue.toLowerCase().includes('now') || column.defaultValue.toLowerCase().includes('current_timestamp')) {
          modifiers.push('@default(now())');
        } else if (!isNaN(Number(column.defaultValue))) {
          modifiers.push(`@default(${column.defaultValue})`);
        } else if (column.defaultValue.toLowerCase() === 'true' || column.defaultValue.toLowerCase() === 'false') {
          modifiers.push(`@default(${column.defaultValue})`);
        } else {
          modifiers.push(`@default("${column.defaultValue}")`);
        }
      }

      if (column.nullable && !column.defaultValue) {
        fieldDef += '?';
      }

      // Add modifiers
      if (modifiers.length > 0) {
        fieldDef += ' ' + modifiers.filter(m => m).join(' ');
      }

      lines.push(fieldDef);

      // Add comment if description exists
      if (column.description) {
        lines.push(`  /// ${column.description}`);
      }
    }

    // Add composite primary key if needed
    const primaryKeyColumns = table.columns.filter(c => c.primaryKey);
    if (primaryKeyColumns.length > 1) {
      const pkFields = primaryKeyColumns.map(c => formatPrismaFieldName(c.name)).join(', ');
      lines.push(`  @@id([${pkFields}])`);
    }

    // Add relationships from this table's foreign keys
    const foreignKeyColumns = table.columns.filter(c => c.foreignKey);
    for (const column of foreignKeyColumns) {
      const targetTable = schema.tables.find(t => t.id === column.foreignKey.tableId);
      if (targetTable) {
        const targetModelName = formatPrismaModelName(targetTable.name);
        const fieldName = formatPrismaFieldName(column.name);
        const targetFieldName = formatPrismaFieldName(targetTable.columns.find(c => c.id === column.foreignKey.columnId)?.name || 'id');

        // Add relation field
        if (fieldName !== targetModelName.toLowerCase()) {
          lines.push(`  ${targetModelName.toLowerCase()} ${targetModelName}? @relation(fields: [${fieldName}], references: [${targetFieldName}]`);
        } else {
          lines.push(`  ${targetModelName}Relation ${targetModelName}? @relation(fields: [${fieldName}], references: [${targetFieldName}]`);
        }

        // Add cascade options if specified
        const relationOptions: string[] = [];
        if (column.foreignKey.onDelete && column.foreignKey.onDelete !== 'NO ACTION') {
          relationOptions.push(`onDelete: ${column.foreignKey.onDelete}`);
        }
        if (column.foreignKey.onUpdate && column.foreignKey.onUpdate !== 'NO ACTION') {
          relationOptions.push(`onUpdate: ${column.foreignKey.onUpdate}`);
        }

        if (relationOptions.length > 0) {
          lines[lines.length - 1] += `, ${relationOptions.join(', ')})`;
        } else {
          lines[lines.length - 1] += ')';
        }
      }
    }

    // Add reverse relationships
    const incomingRelationships = schema.relationships.filter(r => r.targetTableId === table.id);
    for (const relationship of incomingRelationships) {
      const sourceTable = schema.tables.find(t => t.id === relationship.sourceTableId);
      if (sourceTable) {
        const sourceModelName = formatPrismaModelName(sourceTable.name);
        const sourceColumn = sourceTable.columns.find(c => c.id === relationship.sourceColumnId);
        const targetColumn = table.columns.find(c => c.id === relationship.targetColumnId);

        if (sourceColumn && targetColumn) {
          const sourceFieldName = formatPrismaFieldName(sourceColumn.name);
          const targetFieldName = formatPrismaFieldName(targetColumn.name);

          // Determine the field name for the reverse relation
          let reverseFieldName: string;
          if (relationship.type === 'one-to-many') {
            reverseFieldName = sourceModelName.toLowerCase() + 's';
          } else {
            reverseFieldName = sourceModelName.toLowerCase();
          }

          // Check if this relationship already exists as a foreign key
          const existingForeignKey = sourceColumn.foreignKey?.tableId === table.id;

          if (!existingForeignKey) {
            lines.push(`  ${reverseFieldName} ${sourceModelName}[] @relation("${relationship.name || sourceModelName + targetModelName}", fields: [${targetFieldName}], references: [${sourceFieldName}]`);

            // Add cascade options if specified
            const relationOptions: string[] = [];
            if (relationship.onDelete && relationship.onDelete !== 'NO ACTION') {
              relationOptions.push(`onDelete: ${relationship.onDelete}`);
            }
            if (relationship.onUpdate && relationship.onUpdate !== 'NO ACTION') {
              relationOptions.push(`onUpdate: ${relationship.onUpdate}`);
            }

            if (relationOptions.length > 0) {
              lines[lines.length - 1] += `, ${relationOptions.join(', ')})`;
            } else {
              lines[lines.length - 1] += ')';
            }
          }
        }
      }
    }

    // Add table comment if description exists
    if (table.description) {
      lines.push(`  /// ${table.description}`);
    }

    // Add @@map for original table name
    if (formatPrismaModelName(table.name) !== table.name) {
      lines.push(`  @@map("${table.name}")`);
    }

    lines.push('}');
    lines.push('');
  }

  return lines.join('\n');
}