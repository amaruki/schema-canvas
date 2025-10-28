/**
 * SQL generation utilities
 */

import type { Table, Column, Relationship, ForeignKey } from '@/features/schema/types/schema.types';
import type { SQLDialect, ForeignKeyAction } from '@/constants/schema';

export interface SQLOptions {
  dialect: SQLDialect;
  includePositions?: boolean;
  includeDescriptions?: boolean;
  dropTables?: boolean;
}

/**
 * Generates SQL CREATE TABLE statement
 */
export const generateTableSQL = (table: Table, options: SQLOptions): string => {
  const { dialect, includeDescriptions = false } = options;

  const columns = table.columns.map(column =>
    generateColumnSQL(column, dialect)
  ).join(',\n');

  const foreignKeys = table.columns
    .filter(col => col.foreignKey)
    .map(col => generateForeignKeySQL(col, dialect))
    .join(',\n');

  let sql = `CREATE TABLE ${escapeIdentifier(table.name, dialect)} (\n${columns}`;

  if (foreignKeys) {
    sql += ',\n' + foreignKeys;
  }

  sql += '\n);\n';

  if (includeDescriptions && table.description) {
    sql += generateCommentSQL(`Table: ${table.description}`, dialect);
  }

  return sql;
};

/**
 * Generates SQL for a column definition
 */
export const generateColumnSQL = (column: Column, dialect: SQLDialect): string => {
  const name = escapeIdentifier(column.name, dialect);
  const type = mapColumnTypeToSQL(column.type, dialect);

  let columnDef = `  ${name} ${type}`;

  if (!column.nullable) {
    columnDef += ' NOT NULL';
  }

  if (column.primaryKey) {
    columnDef += ' PRIMARY KEY';
  }

  if (column.unique && !column.primaryKey) {
    columnDef += ' UNIQUE';
  }

  if (column.defaultValue) {
    columnDef += ` DEFAULT ${column.defaultValue}`;
  }

  return columnDef;
};

/**
 * Generates SQL for foreign key constraint
 */
export const generateForeignKeySQL = (column: Column, dialect: SQLDialect): string => {
  if (!column.foreignKey) return '';

  const fk = column.foreignKey;
  const constraintName = `fk_${column.name}_${fk.tableId}`;

  let sql = `  CONSTRAINT ${escapeIdentifier(constraintName, dialect)} `;
  sql += `FOREIGN KEY (${escapeIdentifier(column.name, dialect)}) `;
  sql += `REFERENCES ${escapeIdentifier(fk.tableId, dialect)}(${escapeIdentifier(fk.columnId, dialect)})`;

  if (fk.onDelete) {
    sql += ` ON DELETE ${fk.onDelete}`;
  }

  if (fk.onUpdate) {
    sql += ` ON UPDATE ${fk.onUpdate}`;
  }

  return sql;
};

/**
 * Maps column types to SQL dialect-specific types
 */
export const mapColumnTypeToSQL = (type: string, dialect: SQLDialect): string => {
  const typeMap = {
    postgresql: {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'float': 'REAL',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'binary': 'BYTEA',
      'enum': 'VARCHAR(50)',
      'array': 'TEXT[]'
    },
    mysql: {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'integer': 'INT',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'json': 'JSON',
      'jsonb': 'JSON',
      'uuid': 'CHAR(36)',
      'binary': 'BLOB',
      'enum': 'ENUM("")',
      'array': 'JSON'
    },
    sqlite: {
      'string': 'TEXT',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigint': 'INTEGER',
      'float': 'REAL',
      'decimal': 'REAL',
      'boolean': 'INTEGER',
      'date': 'TEXT',
      'datetime': 'TEXT',
      'timestamp': 'TEXT',
      'time': 'TEXT',
      'json': 'TEXT',
      'jsonb': 'TEXT',
      'uuid': 'TEXT',
      'binary': 'BLOB',
      'enum': 'TEXT',
      'array': 'TEXT'
    },
    sqlserver: {
      'string': 'NVARCHAR(255)',
      'text': 'NVARCHAR(MAX)',
      'integer': 'INT',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL',
      'boolean': 'BIT',
      'date': 'DATE',
      'datetime': 'DATETIME2',
      'timestamp': 'DATETIME2',
      'time': 'TIME',
      'json': 'NVARCHAR(MAX)',
      'jsonb': 'NVARCHAR(MAX)',
      'uuid': 'UNIQUEIDENTIFIER',
      'binary': 'VARBINARY(MAX)',
      'enum': 'NVARCHAR(50)',
      'array': 'NVARCHAR(MAX)'
    }
  };

  return typeMap[dialect]?.[type as keyof typeof typeMap[typeof dialect]] || 'VARCHAR(255)';
};

/**
 * Escapes identifiers based on SQL dialect
 */
export const escapeIdentifier = (name: string, dialect: SQLDialect): string => {
  switch (dialect) {
    case 'mysql':
      return `\`${name}\``;
    case 'postgresql':
    case 'sqlserver':
      return `"${name}"`;
    case 'sqlite':
    default:
      return `[${name}]`;
  }
};

/**
 * Generates comment SQL based on dialect
 */
export const generateCommentSQL = (comment: string, dialect: SQLDialect): string => {
  switch (dialect) {
    case 'postgresql':
      return `-- ${comment}\n`;
    case 'mysql':
      return `/* ${comment} */\n`;
    default:
      return `-- ${comment}\n`;
  }
};

/**
 * Generates complete schema SQL
 */
export const generateSchemaSQL = (
  tables: Table[],
  relationships: Relationship[],
  options: SQLOptions
): string => {
  let sql = '';

  if (options.dropTables) {
    sql += '-- Drop tables\n';
    tables.slice().reverse().forEach(table => {
      sql += `DROP TABLE IF EXISTS ${escapeIdentifier(table.name, options.dialect)};\n`;
    });
    sql += '\n';
  }

  sql += '-- Create tables\n';
  tables.forEach(table => {
    sql += generateTableSQL(table, options) + '\n';
  });

  // Generate relationship constraints as ALTER TABLE statements
  relationships.forEach(relationship => {
    sql += generateRelationshipSQL(relationship, tables, options);
  });

  return sql;
};

/**
 * Generates SQL for relationship constraints
 */
export const generateRelationshipSQL = (
  relationship: Relationship,
  tables: Table[],
  options: SQLOptions
): string => {
  const sourceTable = tables.find(t => t.id === relationship.sourceTableId);
  const targetTable = tables.find(t => t.id === relationship.targetTableId);

  if (!sourceTable || !targetTable) return '';

  const sourceColumn = sourceTable.columns.find(c => c.id === relationship.sourceColumnId);
  const targetColumn = targetTable.columns.find(c => c.id === relationship.targetColumnId);

  if (!sourceColumn || !targetColumn) return '';

  const constraintName = `fk_${sourceTable.name}_${targetTable.name}`;
  let sql = `ALTER TABLE ${escapeIdentifier(sourceTable.name, options.dialect)} `;
  sql += `ADD CONSTRAINT ${escapeIdentifier(constraintName, options.dialect)} `;
  sql += `FOREIGN KEY (${escapeIdentifier(sourceColumn.name, options.dialect)}) `;
  sql += `REFERENCES ${escapeIdentifier(targetTable.name, options.dialect)}(${escapeIdentifier(targetColumn.name, options.dialect)})`;

  if (relationship.onDelete) {
    sql += ` ON DELETE ${relationship.onDelete}`;
  }

  if (relationship.onUpdate) {
    sql += ` ON UPDATE ${relationship.onUpdate}`;
  }

  sql += ';\n';
  return sql;
};