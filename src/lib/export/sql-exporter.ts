import { Schema, Table, Column, Relationship } from '@/types/schema';

export type SQLDialect = 'postgresql' | 'mysql' | 'sqlite' | 'sqlserver';

function mapColumnType(type: string, dialect: SQLDialect): string {
  const typeMap: Record<SQLDialect, Record<string, string>> = {
    postgresql: {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL(10,2)',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'TIMESTAMP',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'json': 'JSON',
      'jsonb': 'JSONB',
      'uuid': 'UUID',
      'binary': 'BYTEA',
      'enum': 'VARCHAR(50)', // PostgreSQL uses ENUM type but requires custom type creation
      'array': 'TEXT[]', // Simplified array type
    },
    mysql: {
      'string': 'VARCHAR(255)',
      'text': 'TEXT',
      'integer': 'INT',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL(10,2)',
      'boolean': 'BOOLEAN',
      'date': 'DATE',
      'datetime': 'DATETIME',
      'timestamp': 'TIMESTAMP',
      'time': 'TIME',
      'json': 'JSON',
      'jsonb': 'JSON',
      'uuid': 'CHAR(36)',
      'binary': 'BLOB',
      'enum': 'ENUM()', // MySQL ENUM requires specific values
      'array': 'JSON', // MySQL doesn't have native arrays
    },
    sqlite: {
      'string': 'TEXT',
      'text': 'TEXT',
      'integer': 'INTEGER',
      'bigint': 'INTEGER',
      'float': 'REAL',
      'decimal': 'REAL',
      'boolean': 'INTEGER', // SQLite doesn't have BOOLEAN
      'date': 'TEXT',
      'datetime': 'TEXT',
      'timestamp': 'TEXT',
      'time': 'TEXT',
      'json': 'TEXT',
      'jsonb': 'TEXT',
      'uuid': 'TEXT',
      'binary': 'BLOB',
      'enum': 'TEXT',
      'array': 'TEXT',
    },
    sqlserver: {
      'string': 'NVARCHAR(255)',
      'text': 'NVARCHAR(MAX)',
      'integer': 'INT',
      'bigint': 'BIGINT',
      'float': 'FLOAT',
      'decimal': 'DECIMAL(10,2)',
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
      'array': 'NVARCHAR(MAX)',
    },
  };

  return typeMap[dialect][type] || typeMap[dialect]['string'];
}

function formatTableName(name: string, dialect: SQLDialect): string {
  if (dialect === 'mysql') {
    return `\`${name}\``;
  }
  return `"${name}"`;
}

function formatColumnName(name: string, dialect: SQLDialect): string {
  if (dialect === 'mysql') {
    return `\`${name}\``;
  }
  return `"${name}"`;
}

function formatDefaultValue(value: string, dialect: SQLDialect): string {
  if (!value) return '';

  // Handle special cases
  if (value.toUpperCase() === 'CURRENT_TIMESTAMP') {
    return dialect === 'postgresql' ? 'DEFAULT CURRENT_TIMESTAMP' : 'DEFAULT CURRENT_TIMESTAMP';
  }

  if (value.toUpperCase() === 'NULL') {
    return 'DEFAULT NULL';
  }

  // Handle numeric values
  if (!isNaN(Number(value)) && value.trim() !== '') {
    return `DEFAULT ${value}`;
  }

  // Handle boolean values
  if (value.toLowerCase() === 'true') {
    return dialect === 'postgresql' ? 'DEFAULT TRUE' : 'DEFAULT 1';
  }
  if (value.toLowerCase() === 'false') {
    return dialect === 'postgresql' ? 'DEFAULT FALSE' : 'DEFAULT 0';
  }

  // Handle string values
  return `DEFAULT '${value.replace(/'/g, "''")}'`;
}

export function exportToSQL(schema: Schema, dialect: SQLDialect = 'postgresql'): string {
  const statements: string[] = [];

  // Add header comment
  statements.push(`-- Schema: ${schema.name}`);
  statements.push(`-- Generated: ${new Date().toISOString()}`);
  statements.push(`-- Dialect: ${dialect.toUpperCase()}`);
  statements.push('');

  // Sort tables by dependencies (tables with foreign keys come after their references)
  const sortedTables = [...schema.tables].sort((a, b) => {
    const aHasForeignKeys = a.columns.some(col => col.foreignKey);
    const bHasForeignKeys = b.columns.some(col => col.foreignKey);

    if (aHasForeignKeys && !bHasForeignKeys) return 1;
    if (!aHasForeignKeys && bHasForeignKeys) return -1;
    return 0;
  });

  // Generate CREATE TABLE statements
  for (const table of sortedTables) {
    const tableName = formatTableName(table.name, dialect);
    const columns: string[] = [];
    const constraints: string[] = [];

    // Add columns
    for (const column of table.columns) {
      const columnName = formatColumnName(column.name, dialect);
      const columnType = mapColumnType(column.type, dialect);

      let columnDef = `${columnName} ${columnType}`;

      // Add NOT NULL constraint
      if (!column.nullable) {
        columnDef += ' NOT NULL';
      }

      // Add UNIQUE constraint
      if (column.unique) {
        columnDef += ' UNIQUE';
      }

      // Add DEFAULT value
      if (column.defaultValue) {
        columnDef += ` ${formatDefaultValue(column.defaultValue, dialect)}`;
      }

      // Add PRIMARY KEY (will be added as table constraint for composite keys)
      if (column.primaryKey && table.columns.filter(c => c.primaryKey).length === 1) {
        if (dialect === 'postgresql') {
          columnDef += ' PRIMARY KEY';
        } else if (dialect === 'sqlserver') {
          // SQL Server handles PK separately
        } else {
          columnDef += ' PRIMARY KEY';
        }
      }

      columns.push(columnDef);
    }

    // Add table constraints
    const primaryKeyColumns = table.columns.filter(c => c.primaryKey);
    if (primaryKeyColumns.length > 1 || (primaryKeyColumns.length === 1 && dialect === 'sqlserver')) {
      const pkColumns = primaryKeyColumns.map(c => formatColumnName(c.name, dialect)).join(', ');
      constraints.push(`PRIMARY KEY (${pkColumns})`);
    }

    // Add CREATE TABLE statement
    statements.push(`CREATE TABLE ${tableName} (`);
    statements.push(`  ${columns.join(',\n  ')}${constraints.length > 0 ? ',\n  ' + constraints.join(',\n  ') : ''}`);
    statements.push(');');
    statements.push('');
  }

  // Add foreign key constraints
  for (const table of schema.tables) {
    for (const column of table.columns) {
      if (column.foreignKey) {
        const sourceTable = formatTableName(table.name, dialect);
        const sourceColumn = formatColumnName(column.name, dialect);
        const targetTable = schema.tables.find(t => t.id === column.foreignKey.tableId);

        if (targetTable) {
          const targetColumnName = targetTable.columns.find(c => c.id === column.foreignKey.columnId)?.name;
          if (targetColumnName) {
            const targetTableFormatted = formatTableName(targetTable.name, dialect);
            const targetColumnFormatted = formatColumnName(targetColumnName, dialect);

            let constraintName = `fk_${table.name}_${column.name}_${targetTable.name}`;
            if (dialect === 'mysql') {
              constraintName = constraintName.substring(0, 64); // MySQL limit
            }

            let fkStatement = `ALTER TABLE ${sourceTable}`;
            fkStatement += ` ADD CONSTRAINT ${formatColumnName(constraintName, dialect)}`;
            fkStatement += ` FOREIGN KEY (${sourceColumn})`;
            fkStatement += ` REFERENCES ${targetTableFormatted}(${targetColumnFormatted})`;

            if (column.foreignKey.onDelete && column.foreignKey.onDelete !== 'NO ACTION') {
              fkStatement += ` ON DELETE ${column.foreignKey.onDelete}`;
            }

            if (column.foreignKey.onUpdate && column.foreignKey.onUpdate !== 'NO ACTION') {
              fkStatement += ` ON UPDATE ${column.foreignKey.onUpdate}`;
            }

            fkStatement += ';';
            statements.push(fkStatement);
          }
        }
      }
    }
  }

  // Add relationships as foreign keys (if not already added via column foreign keys)
  for (const relationship of schema.relationships) {
    const sourceTable = schema.tables.find(t => t.id === relationship.sourceTableId);
    const targetTable = schema.tables.find(t => t.id === relationship.targetTableId);

    if (sourceTable && targetTable) {
      const sourceColumn = sourceTable.columns.find(c => c.id === relationship.sourceColumnId);
      const targetColumn = targetTable.columns.find(c => c.id === relationship.targetColumnId);

      if (sourceColumn && targetColumn && !sourceColumn.foreignKey) {
        const sourceTableFormatted = formatTableName(sourceTable.name, dialect);
        const sourceColumnFormatted = formatColumnName(sourceColumn.name, dialect);
        const targetTableFormatted = formatTableName(targetTable.name, dialect);
        const targetColumnFormatted = formatColumnName(targetColumn.name, dialect);

        let constraintName = `rel_${sourceTable.name}_${targetTable.name}`;
        if (dialect === 'mysql') {
          constraintName = constraintName.substring(0, 64);
        }

        let relStatement = `ALTER TABLE ${sourceTableFormatted}`;
        relStatement += ` ADD CONSTRAINT ${formatColumnName(constraintName, dialect)}`;
        relStatement += ` FOREIGN KEY (${sourceColumnFormatted})`;
        relStatement += ` REFERENCES ${targetTableFormatted}(${targetColumnFormatted})`;

        if (relationship.onDelete && relationship.onDelete !== 'NO ACTION') {
          relStatement += ` ON DELETE ${relationship.onDelete}`;
        }

        if (relationship.onUpdate && relationship.onUpdate !== 'NO ACTION') {
          relStatement += ` ON UPDATE ${relationship.onUpdate}`;
        }

        relStatement += ';';
        statements.push(relStatement);
      }
    }
  }

  return statements.join('\n');
}