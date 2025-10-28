import { Schema, Table, Column, Relationship, ColumnType, RelationshipType } from '@/types/schema';

interface DjangoField {
  name: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey: boolean;
  unique: boolean;
  defaultValue?: string;
  foreignKey?: {
    model: string;
    field: string;
    onDelete?: string;
  };
  description?: string;
}

interface DjangoModel {
  name: string;
  tableName?: string;
  fields: DjangoField[];
  description?: string;
}

export function parseDjangoModels(content: string): Schema {
  console.log('🔍 Starting Django model import...');
  const models: DjangoModel[] = [];

  // Remove comments and clean up the content
  const cleanContent = content
    .split('\n')
    .map(line => line.split('#')[0].trim()) // Remove comments
    .filter(line => line.length > 0)
    .join('\n');

  console.log('📝 Cleaned content length:', cleanContent.length);

  // Find all class definitions
  const classRegex = /class\s+(\w+)\s*\((.*?)\):/g;
  let match;

  while ((match = classRegex.exec(cleanContent)) !== null) {
    const className = match[1];
    const inheritance = match[2];

    console.log(`🏗️  Found class: ${className}, inheritance: ${inheritance}`);

    // Skip if not a models.Model
    if (!inheritance.includes('models.Model')) {
      console.log(`⏭️  Skipping ${className} - not a models.Model`);
      continue;
    }

    const model: DjangoModel = {
      name: className,
      fields: [],
    };

    // Extract the class content
    const classStart = match.index + match[0].length;
    const classEnd = findClassEnd(cleanContent, classStart);
    const classContent = cleanContent.substring(classStart, classEnd);

    console.log(`📋 Class start: ${classStart}, end: ${classEnd}, length: ${classContent.length}`);
    console.log(`📋 Extracted class content for ${className}:`, classContent.substring(0, 300) + '...');

    // Parse Meta class
    const metaMatch = classContent.match(/class\s+Meta\s*:([\s\S]*?)(?=class|\Z)/);
    if (metaMatch) {
      const metaContent = metaMatch[1];
      const dbTableMatch = metaContent.match(/db_table\s*=\s*['"`]([^'"`]+)['"`]/);
      if (dbTableMatch) {
        model.tableName = dbTableMatch[1];
        console.log(`📊 Found custom table name for ${className}: ${model.tableName}`);
      }
    }

    // Parse fields
    parseFields(classContent, model);
    console.log(`🔧 Parsed ${model.fields.length} fields for ${className}:`, model.fields.map(f => f.name));

    // Add documentation if present
    const docstringMatch = classContent.match(/class\s+Meta.*?"""([\s\S]*?)"""/);
    if (docstringMatch) {
      model.description = docstringMatch[1].trim();
      console.log(`📄 Found description for ${className}: ${model.description}`);
    }

    models.push(model);
  }

  console.log(`🎯 Total models parsed: ${models.length}`);

  // Convert Django models to Schema format
  const schema = convertDjangoToSchema(models);
  console.log(`✅ Final schema: ${schema.tables.length} tables, ${schema.relationships.length} relationships`);

  return schema;
}

function findClassEnd(content: string, startIndex: number): number {
  let i = startIndex;
  let braceCount = 0;
  let inClass = true;

  // Skip initial whitespace
  while (i < content.length && /\s/.test(content[i])) {
    i++;
  }

  // Find the base indentation level (class definition line)
  let baseIndent = startIndex;
  while (baseIndent > 0 && content[baseIndent - 1] !== '\n') {
    baseIndent--;
  }
  while (baseIndent < i && /\s/.test(content[baseIndent])) {
    baseIndent++;
  }

  while (i < content.length && inClass) {
    const lineStart = i;

    // Find the end of the current line
    while (i < content.length && content[i] !== '\n') {
      i++;
    }

    const line = content.substring(lineStart, i).trim();

    // Skip empty lines
    if (line === '') {
      i++;
      continue;
    }

    // Count indentation for this line
    let lineIndent = lineStart;
    while (lineIndent < content.length && /\s/.test(content[lineIndent])) {
      lineIndent++;
    }

    // If we find another class or function definition at same or lower indentation
    if (line.startsWith('class ') || line.startsWith('def ')) {
      if (lineIndent <= baseIndent) {
        // We've found the start of the next class/function
        return lineStart;
      }
    }

    // If we're at the end of the file
    if (i >= content.length) {
      return content.length;
    }

    i++; // Skip the newline
  }

  return content.length;
}

function parseFields(classContent: string, model: DjangoModel): void {
  console.log('🔍 Parsing fields from content:', classContent.substring(0, 200) + '...');

  // Find lines that contain field definitions
  const lines = classContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines, comments, and class definitions
    if (!line || line.startsWith('#') || line.startsWith('class ') || line.startsWith('def ') || line.startsWith('"""')) {
      continue;
    }

    console.log('🔎 Processing line:', line);

    // Match field definition: field_name = models.FieldType(...)
    const fieldMatch = line.match(/^(\w+)\s*=\s*models\.(\w+)(?:\((.*)\))?/);

    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const fieldArgs = fieldMatch[3] || '';

      console.log(`✅ Found field: ${fieldName} of type ${fieldType} with args: ${fieldArgs}`);

      // Skip Meta class fields
      if (fieldName === 'Meta' || fieldType === 'Meta') {
        continue;
      }

      const field: DjangoField = {
        name: fieldName,
        type: mapDjangoType(fieldType),
        nullable: true,
        primaryKey: false,
        unique: false,
      };

      // Parse field arguments
      parseFieldArguments(fieldArgs, field);

      // Handle special cases
      if (fieldType === 'AutoField' || fieldType === 'BigAutoField') {
        field.primaryKey = true;
        field.nullable = false;
        field.type = 'integer';
      }

      if (fieldName === 'id' && !model.fields.some(f => f.primaryKey)) {
        field.primaryKey = true;
        field.nullable = false;
      }

      model.fields.push(field);
      console.log(`📝 Added field: ${fieldName} (type: ${field.type}, nullable: ${field.nullable}, pk: ${field.primaryKey})`);
    } else {
      // Try multiline field parsing
      if (line.includes('models.') && line.includes('(')) {
        // This might be a multiline field definition, collect the complete definition
        let fullFieldDef = line;
        let braceCount = (line.match(/\(/g) || []).length - (line.match(/\)/g) || []).length;
        let j = i + 1;

        while (j < lines.length && braceCount > 0) {
          fullFieldDef += ' ' + lines[j].trim();
          braceCount += (lines[j].match(/\(/g) || []).length - (lines[j].match(/\)/g) || []).length;
          j++;
        }

        console.log('🔗 Multiline field definition:', fullFieldDef);

        const multiFieldMatch = fullFieldDef.match(/^(\w+)\s*=\s*models\.(\w+)\s*\((.*)\)/);
        if (multiFieldMatch) {
          const fieldName = multiFieldMatch[1];
          const fieldType = multiFieldMatch[2];
          const fieldArgs = multiFieldMatch[3] || '';

          console.log(`✅ Found multiline field: ${fieldName} of type ${fieldType}`);

          const field: DjangoField = {
            name: fieldName,
            type: mapDjangoType(fieldType),
            nullable: true,
            primaryKey: false,
            unique: false,
          };

          parseFieldArguments(fieldArgs, field);

          if (fieldType === 'AutoField' || fieldType === 'BigAutoField') {
            field.primaryKey = true;
            field.nullable = false;
            field.type = 'integer';
          }

          if (fieldName === 'id' && !model.fields.some(f => f.primaryKey)) {
            field.primaryKey = true;
            field.nullable = false;
          }

          model.fields.push(field);
          console.log(`📝 Added multiline field: ${fieldName} (type: ${field.type}, nullable: ${field.nullable}, pk: ${field.primaryKey})`);

          i = j - 1; // Skip the lines we just processed
        }
      }
    }
  }

  console.log(`🏁 Finished parsing fields. Total fields: ${model.fields.length}`);
}

function parseFieldArguments(args: string, field: DjangoField): void {
  console.log(`🔧 Parsing field arguments: "${args}"`);

  // Clean up the arguments and normalize them
  const cleanArgs = args.replace(/\s+/g, ' ').trim();

  // Parse null constraint
  if (cleanArgs.includes('null=True')) {
    field.nullable = true;
    console.log('✅ Found null=True');
  } else if (cleanArgs.includes('null=False')) {
    field.nullable = false;
    console.log('✅ Found null=False');
  }

  // Parse blank constraint
  if (cleanArgs.includes('blank=True')) {
    field.nullable = true;
    console.log('✅ Found blank=True');
  }

  // Parse unique constraint
  if (cleanArgs.includes('unique=True')) {
    field.unique = true;
    console.log('✅ Found unique=True');
  }

  // Parse default value - more robust regex
  const defaultMatch = cleanArgs.match(/default\s*=\s*([^,\)]+(?:\([^)]*\))?)/);
  if (defaultMatch) {
    let defaultValue = defaultMatch[1].trim();
    // Remove quotes but keep content
    defaultValue = defaultValue.replace(/^['"`]|['"`]$/g, '');
    field.defaultValue = defaultValue;
    console.log(`✅ Found default value: ${defaultValue}`);
  }

  // Parse foreign key - improved regex
  const fkMatch = cleanArgs.match(/ForeignKey\s*\(\s*['"`]([^'"`]+)['"`]/);
  if (fkMatch) {
    const relatedModel = fkMatch[1];

    field.foreignKey = {
      model: relatedModel,
      field: 'id', // Default to id field
    };

    console.log(`✅ Found foreign key to: ${relatedModel}`);

    // Parse on_delete
    const onDeleteMatch = cleanArgs.match(/on_delete\s*=\s*models\.(\w+)/);
    if (onDeleteMatch) {
      field.foreignKey.onDelete = onDeleteMatch[1];
      console.log(`✅ Found on_delete: ${onDeleteMatch[1]}`);
    }

    // Foreign keys are usually not nullable unless explicitly set
    if (!cleanArgs.includes('null=True') && !cleanArgs.includes('blank=True')) {
      field.nullable = false;
      console.log('✅ Foreign key is not nullable');
    }
  }

  // Parse CharField max_length
  const maxLengthMatch = cleanArgs.match(/max_length\s*=\s*(\d+)/);
  if (maxLengthMatch) {
    // Use specific length if available
    field.type = 'string';
    console.log(`✅ Found max_length: ${maxLengthMatch[1]}`);
  }

  // Handle special field types
  if (cleanArgs.includes('primary_key=True')) {
    field.primaryKey = true;
    field.nullable = false;
    console.log('✅ Found primary_key=True');
  }

  // Handle AutoField special case
  if (cleanArgs.includes('AutoField') || cleanArgs.includes('BigAutoField')) {
    field.primaryKey = true;
    field.nullable = false;
    field.type = 'integer';
    console.log('✅ Found AutoField');
  }

  console.log(`🔧 Field result - nullable: ${field.nullable}, unique: ${field.unique}, pk: ${field.primaryKey}, fk: ${field.foreignKey ? field.foreignKey.model : 'none'}`);
}

function mapDjangoType(djangoType: string): ColumnType {
  const typeMap: Record<string, ColumnType> = {
    'CharField': 'string',
    'TextField': 'text',
    'IntegerField': 'integer',
    'BigIntegerField': 'bigint',
    'SmallIntegerField': 'integer',
    'AutoField': 'integer',
    'BigAutoField': 'bigint',
    'FloatField': 'float',
    'DecimalField': 'decimal',
    'BooleanField': 'boolean',
    'DateField': 'date',
    'DateTimeField': 'datetime',
    'TimeField': 'time',
    'JSONField': 'json',
    'UUIDField': 'uuid',
    'BinaryField': 'binary',
    'EmailField': 'string',
    'URLField': 'string',
    'SlugField': 'string',
    'PositiveIntegerField': 'integer',
    'PositiveSmallIntegerField': 'integer',
    'PositiveBigIntegerField': 'bigint',
    'ForeignKey': 'integer', // Will be updated based on the related field
    'OneToOneField': 'integer',
    'ManyToManyField': 'json', // Simplified representation
  };

  return typeMap[djangoType] || 'string';
}

function convertDjangoToSchema(models: DjangoModel[]): Schema {
  const tables: Table[] = [];
  const relationships: Relationship[] = [];

  // Create a model lookup for easier reference
  const modelLookup: Record<string, DjangoModel> = {};
  models.forEach(model => {
    modelLookup[model.name] = model;
  });

  // Generate a unique ID for this import session
  const importId = Date.now();
  let columnCounter = 0;

  // First pass: create tables
  models.forEach((model, index) => {
    const tableName = model.tableName || snakeCase(model.name);

    const columns: Column[] = model.fields.map((field, fieldIndex) => ({
      id: `${tableName}_${field.name}_${importId}_${columnCounter++}`, // Ensure unique IDs
      name: field.name,
      type: field.type,
      nullable: field.nullable,
      primaryKey: field.primaryKey,
      unique: field.unique,
      defaultValue: field.defaultValue,
      description: field.description,
      foreignKey: field.foreignKey ? {
        tableId: '', // Will be filled in second pass
        columnId: '', // Will be filled in second pass
        onDelete: mapDjangoOnDelete(field.foreignKey.onDelete) || 'CASCADE',
        onUpdate: 'CASCADE',
      } : undefined,
    }));

    tables.push({
      id: tableName,
      name: tableName,
      position: {
        x: 100 + (index % 3) * 300, // Better positioning
        y: 100 + Math.floor(index / 3) * 250
      },
      columns,
      description: model.description,
    });
  });

  // Second pass: create relationships and fix foreign key references
  console.log('🔗 Starting relationship creation...');
  tables.forEach(table => {
    console.log(`📋 Processing table: ${table.name} with ${table.columns.length} columns`);
    table.columns.forEach(column => {
      if (column.foreignKey && column.foreignKey.tableId === '') {
        console.log(`🔎 Found foreign key column: ${column.name} in table ${table.name}`);

        // Find the Django model that corresponds to this table
        const modelName = pascalCase(table.name);
        console.log(`🏷️  Looking for Django model: ${modelName}`);
        const djangoModel = modelLookup[modelName];

        if (djangoModel) {
          console.log(`✅ Found Django model: ${djangoModel.name}`);
          // Find the field that has this foreign key
          const djangoField = djangoModel.fields.find(f => f.name === column.name);
          if (djangoField && djangoField.foreignKey) {
            console.log(`🔗 Found Django field with foreign key: ${djangoField.name} -> ${djangoField.foreignKey.model}`);
            const relatedModelName = djangoField.foreignKey.model;
            const relatedDjangoModel = modelLookup[relatedModelName];

            if (relatedDjangoModel) {
              console.log(`✅ Found related Django model: ${relatedDjangoModel.name}`);
              const targetTableName = relatedDjangoModel.tableName || snakeCase(relatedModelName);
              console.log(`🎯 Target table name: ${targetTableName}`);
              const targetTable = tables.find(t => t.name === targetTableName);

              if (targetTable) {
                console.log(`✅ Found target table: ${targetTable.name} with ${targetTable.columns.length} columns`);

                // Find the target column (usually 'id' or primary key)
                const targetColumn = targetTable.columns.find(c => c.primaryKey) ||
                                   targetTable.columns.find(c => c.name === 'id') ||
                                   targetTable.columns[0];

                if (targetColumn) {
                  console.log(`🎯 Found target column: ${targetColumn.name} (PK: ${targetColumn.primaryKey})`);

                  // Update the foreign key reference
                  column.foreignKey.tableId = targetTable.id;
                  column.foreignKey.columnId = targetColumn.id;

                  // Create relationship
                  const relationship: Relationship = {
                    id: `rel_${table.id}_${column.name}_${targetTable.id}_${targetColumn.name}`,
                    sourceTableId: table.id,
                    sourceColumnId: column.id,
                    targetTableId: targetTable.id,
                    targetColumnId: targetColumn.id,
                    type: 'one-to-many' as RelationshipType, // Django ForeignKey creates one-to-many relationship
                    onDelete: column.foreignKey.onDelete as any,
                    onUpdate: 'CASCADE',
                  };

                  relationships.push(relationship);
                  console.log(`✅ Created relationship: ${table.name}.${column.name} -> ${targetTable.name}.${targetColumn.name}`);
                } else {
                  console.log(`❌ No target column found in ${targetTable.name}`);
                }
              } else {
                console.log(`❌ Target table not found: ${targetTableName}`);
              }
            } else {
              console.log(`❌ Related Django model not found: ${relatedModelName}`);
            }
          } else {
            console.log(`❌ No foreign key field found for ${column.name}`);
          }
        } else {
          console.log(`❌ Django model not found: ${modelName}`);
        }
      }
    });
  });
  console.log(`🔗 Created ${relationships.length} relationships total`);

  return {
    id: `imported_${Date.now()}`,
    name: 'Imported Django Schema',
    description: 'Schema imported from Django models',
    tables,
    relationships,
    createdAt: new Date(),
    updatedAt: new Date(),
    version: 1,
  };
}

// Helper functions
function snakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .replace(/^_/, '')
    .toLowerCase();
}

function pascalCase(str: string): string {
  return str
    .split(/[_\s-]/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function mapDjangoOnDelete(onDelete?: string): 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION' | undefined {
  const mapping: Record<string, 'CASCADE' | 'SET NULL' | 'RESTRICT' | 'NO ACTION'> = {
    'CASCADE': 'CASCADE',
    'SET_NULL': 'SET NULL',
    'PROTECT': 'RESTRICT',
    'RESTRICT': 'RESTRICT',
    'DO_NOTHING': 'NO ACTION',
  };

  return onDelete ? mapping[onDelete] : undefined;
}

// Helper function to validate Django model syntax
export function validateDjangoModels(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required imports
  if (!content.includes('from django.db import models')) {
    errors.push('Missing required import: from django.db import models');
  }

  // Check for at least one model
  if (!content.match(/class\s+\w+\s*\([^)]*models\.Model[^)]*\):/)) {
    errors.push('No Django models found. Models must inherit from models.Model');
  }

  // Basic syntax check
  try {
    const lines = content.split('\n');
    let inClass = false;
    let classIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line === '') continue;
      if (line.startsWith('#')) continue;

      // Check for class definition
      if (line.startsWith('class ')) {
        inClass = true;
        classIndent = lines[i].length - lines[i].trimLeft().length;
      } else if (inClass && line.length > 0) {
        const currentIndent = lines[i].length - lines[i].trimLeft().length;

        // If we hit a line with less indentation, class ends
        if (currentIndent <= classIndent && !line.startsWith('class ')) {
          inClass = false;
        }
      }
    }
  } catch (error) {
    errors.push('Syntax error in Django models');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
