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
  oneToOneField?: {
    model: string;
    field: string;
    onDelete?: string;
  };
  manyToManyField?: {
    model: string;
    through?: string; // Intermediate model for M2M
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
  const models: DjangoModel[] = [];

  // Remove comments and clean up the content while preserving structure
  const cleanContent = content
    .split('\n')
    .map(line => {
      // Remove comments but preserve the line structure and indentation
      const commentIndex = line.indexOf('#');
      if (commentIndex !== -1) {
        return line.substring(0, commentIndex).trimEnd();
      }
      return line;
    })
    .filter(line => line.trim().length > 0)
    .join('\n');

  // Find all class definitions
  const classRegex = /class\s+(\w+)\s*\((.*?)\):/g;
  let match;

  while ((match = classRegex.exec(cleanContent)) !== null) {
    const className = match[1];
    const inheritance = match[2];

    // Skip if not a models.Model
    if (!inheritance.includes('models.Model')) {
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


    // Parse Meta class
    const metaMatch = classContent.match(/class\s+Meta\s*:([\s\S]*?)(?=class|\Z)/);
    if (metaMatch) {
      const metaContent = metaMatch[1];
      const dbTableMatch = metaContent.match(/db_table\s*=\s*['"`]([^'"`]+)['"`]/);
      if (dbTableMatch) {
        model.tableName = dbTableMatch[1];
      }
    }

    // Parse fields
    parseFields(classContent, model);

    // Add automatic id field if no primary key exists (Django default behavior)
    const hasPrimaryKey = model.fields.some(field => field.primaryKey);
    if (!hasPrimaryKey) {
      const idField: DjangoField = {
        name: 'id',
        type: 'integer',
        nullable: false,
        primaryKey: true,
        unique: true,
        description: 'Auto-generated primary key (Django default)'
      };
      // Add id field as the first column
      model.fields.unshift(idField);
    }

    // Add documentation if present
    const docstringMatch = classContent.match(/class\s+Meta.*?"""([\s\S]*?)"""/);
    if (docstringMatch) {
      model.description = docstringMatch[1].trim();
    }

    models.push(model);
  }


  // Convert Django models to Schema format
  const schema = convertDjangoToSchema(models);

  return schema;
}

function findClassEnd(content: string, startIndex: number): number {
  let i = startIndex;

  // Find the start of the current line (class definition line)
  while (i > 0 && content[i - 1] !== '\n') {
    i--;
  }
  const classLineStart = i;

  // Get the class definition line to determine base indentation
  while (i < content.length && content[i] !== '\n') {
    i++;
  }
  const classLineEnd = i;
  const classLine = content.substring(classLineStart, classLineEnd);

  // Calculate base indentation (number of leading spaces/tabs)
  const baseIndent = classLine.search(/\S/);

  // Move to the next line
  i++;

  while (i < content.length) {
    const lineStart = i;

    // Find the end of the current line
    while (i < content.length && content[i] !== '\n') {
      i++;
    }
    const lineEnd = i;
    const line = content.substring(lineStart, lineEnd);

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Calculate current line indentation
    const currentIndent = line.search(/\S/);

    // If we find another class or function definition at same or lower indentation
    const trimmedLine = line.trim();
    if ((trimmedLine.startsWith('class ') || trimmedLine.startsWith('def ')) && currentIndent <= baseIndent) {
      // We've found the start of the next class/function
      return lineStart;
    }

    // Move to next line
    i++;
  }

  // If we've reached the end of the content
  return content.length;
}

function parseFields(classContent: string, model: DjangoModel): void {

  // Find lines that contain field definitions
  const lines = classContent.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    // Skip empty lines, comments, and class definitions
    if (!line || line.startsWith('#') || line.startsWith('class ') || line.startsWith('def ') || line.startsWith('"""')) {
      continue;
    }


    // Match field definition: field_name = models.FieldType(...)
    const fieldMatch = line.match(/^(\w+)\s*=\s*models\.(\w+)(?:\((.*)\))?/);

    if (fieldMatch) {
      const fieldName = fieldMatch[1];
      const fieldType = fieldMatch[2];
      const fieldArgs = fieldMatch[3] || '';


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

      // Parse field arguments - pass field type for relationship parsing
      parseFieldArguments(fieldArgs, field, fieldType);

      // Handle special cases
      if (fieldType === 'AutoField' || fieldType === 'BigAutoField') {
        field.primaryKey = true;
        field.nullable = false;
        field.type = 'integer';
      }

      // Special handling for relationship fields - set type after parsing arguments
      if (fieldType === 'ForeignKey' && field.foreignKey) {
        field.type = 'integer'; // Foreign keys are typically integers
      } else if (fieldType === 'OneToOneField' && field.oneToOneField) {
        field.type = 'integer'; // OneToOneField is also typically an integer
      } else if (fieldType === 'ManyToManyField' && field.manyToManyField) {
        field.type = 'json'; // Simplified representation for M2M
      }

      // Note: Automatic id field creation is now handled at the model level
      // after all fields are parsed

      model.fields.push(field);
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


        const multiFieldMatch = fullFieldDef.match(/^(\w+)\s*=\s*models\.(\w+)\s*\((.*)\)/);
        if (multiFieldMatch) {
          const fieldName = multiFieldMatch[1];
          const fieldType = multiFieldMatch[2];
          const fieldArgs = multiFieldMatch[3] || '';


          const field: DjangoField = {
            name: fieldName,
            type: mapDjangoType(fieldType),
            nullable: true,
            primaryKey: false,
            unique: false,
          };

          parseFieldArguments(fieldArgs, field, fieldType);

          if (fieldType === 'AutoField' || fieldType === 'BigAutoField') {
            field.primaryKey = true;
            field.nullable = false;
            field.type = 'integer';
          }

          // Special handling for relationship fields - set type after parsing arguments
          if (fieldType === 'ForeignKey' && field.foreignKey) {
            field.type = 'integer'; // Foreign keys are typically integers
          } else if (fieldType === 'OneToOneField' && field.oneToOneField) {
            field.type = 'integer'; // OneToOneField is also typically an integer
          } else if (fieldType === 'ManyToManyField' && field.manyToManyField) {
            field.type = 'json'; // Simplified representation for M2M
          }

          // Note: Automatic id field creation is now handled at the model level
          // after all fields are parsed

          model.fields.push(field);

          i = j - 1; // Skip the lines we just processed
        }
      }
    }
  }

}

function parseFieldArguments(args: string, field: DjangoField, fieldType?: string): void {

  // Clean up the arguments and normalize them
  const cleanArgs = args.replace(/\s+/g, ' ').trim();

  // Parse null constraint
  if (cleanArgs.includes('null=True')) {
    field.nullable = true;
  } else if (cleanArgs.includes('null=False')) {
    field.nullable = false;
  }

  // Parse blank constraint
  if (cleanArgs.includes('blank=True')) {
    field.nullable = true;
  }

  // Parse unique constraint
  if (cleanArgs.includes('unique=True')) {
    field.unique = true;
  }

  // Parse default value - more robust regex
  const defaultMatch = cleanArgs.match(/default\s*=\s*([^,\)]+(?:\([^)]*\))?)/);
  if (defaultMatch) {
    let defaultValue = defaultMatch[1].trim();
    // Remove quotes but keep content
    defaultValue = defaultValue.replace(/^['"`]|['"`]$/g, '');
    field.defaultValue = defaultValue;
  }

  // Parse relationship fields based on field type
  if (fieldType === 'ForeignKey') {
    // For ForeignKey, the first argument is the related model
    const modelMatch = cleanArgs.match(/^['"`]?([^'"\s,\)]+)['"`]?/);
    if (modelMatch) {
      const relatedModel = modelMatch[1];

      field.foreignKey = {
        model: relatedModel,
        field: 'id', // Default to id field
      };

      // Parse on_delete
      const onDeleteMatch = cleanArgs.match(/on_delete\s*=\s*models\.(\w+)/);
      if (onDeleteMatch) {
        field.foreignKey.onDelete = onDeleteMatch[1];
      }

      // Foreign keys are usually not nullable unless explicitly set
      if (!cleanArgs.includes('null=True') && !cleanArgs.includes('blank=True')) {
        field.nullable = false;
      }
    }
  } else if (fieldType === 'OneToOneField') {
    // For OneToOneField, the first argument is the related model
    const modelMatch = cleanArgs.match(/^['"`]?([^'"\s,\)]+)['"`]?/);
    if (modelMatch) {
      const relatedModel = modelMatch[1];

      field.oneToOneField = {
        model: relatedModel,
        field: 'id', // Default to id field
      };

      // Parse on_delete
      const onDeleteMatch = cleanArgs.match(/on_delete\s*=\s*models\.(\w+)/);
      if (onDeleteMatch) {
        field.oneToOneField.onDelete = onDeleteMatch[1];
      }

      // OneToOneField are usually not nullable unless explicitly set
      if (!cleanArgs.includes('null=True') && !cleanArgs.includes('blank=True')) {
        field.nullable = false;
      }
    }
  } else if (fieldType === 'ManyToManyField') {
    // For ManyToManyField, the first argument is the related model
    const modelMatch = cleanArgs.match(/^['"`]?([^'"\s,\)]+)['"`]?/);
    if (modelMatch) {
      const relatedModel = modelMatch[1];

      field.manyToManyField = {
        model: relatedModel,
      };

      // Parse through model for intermediate table
      const throughMatch = cleanArgs.match(/through\s*=\s*['"`]([^'"`]+)['"`]/);
      if (throughMatch) {
        field.manyToManyField.through = throughMatch[1];
      }

      // ManyToManyField doesn't affect nullability in the same way
      field.type = 'json'; // Simplified representation for M2M
    }
  }

  // Parse CharField max_length
  const maxLengthMatch = cleanArgs.match(/max_length\s*=\s*(\d+)/);
  if (maxLengthMatch) {
    // Use specific length if available
    field.type = 'string';
  }

  // Handle special field types
  if (cleanArgs.includes('primary_key=True')) {
    field.primaryKey = true;
    field.nullable = false;
  }

  // Handle AutoField special case
  if (cleanArgs.includes('AutoField') || cleanArgs.includes('BigAutoField')) {
    field.primaryKey = true;
    field.nullable = false;
    field.type = 'integer';
  }

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
  const tableToModelLookup: Record<string, DjangoModel> = {};
  
  models.forEach(model => {
    modelLookup[model.name] = model;
    // Also create a mapping from table name to model
    const tableName = model.tableName || snakeCase(model.name);
    tableToModelLookup[tableName] = model;
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
      } : (field.oneToOneField ? {
        tableId: '', // Will be filled in second pass
        columnId: '', // Will be filled in second pass
        onDelete: mapDjangoOnDelete(field.oneToOneField.onDelete) || 'CASCADE',
        onUpdate: 'CASCADE',
      } : undefined),
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
  tables.forEach(table => {
    table.columns.forEach(column => {
      if (column.foreignKey && column.foreignKey.tableId === '') {

        // Find the Django model that corresponds to this table
        // First try direct table name lookup (handles custom db_table names)
        let djangoModel = tableToModelLookup[table.name];
        let modelName = '';
        
        if (!djangoModel) {
          // Fallback to pascal case conversion (for tables without custom names)
          modelName = pascalCase(table.name);
          djangoModel = modelLookup[modelName];
        } else {
          modelName = djangoModel.name;
        }

        if (djangoModel) {
          // Find the field that has this relationship
          const djangoField = djangoModel.fields.find(f => f.name === column.name);

          if (djangoField && (djangoField.foreignKey || djangoField.oneToOneField)) {
            const relationship = djangoField.foreignKey || djangoField.oneToOneField;
            if (relationship) {
              const relatedModelName = relationship.model;
              const relatedDjangoModel = modelLookup[relatedModelName];

            if (relatedDjangoModel) {
                const targetTableName = relatedDjangoModel.tableName || snakeCase(relatedModelName);
                const targetTable = tables.find(t => t.name === targetTableName);

                if (targetTable) {

                  // Find the target column (usually 'id' or primary key)
                  const targetColumn = targetTable.columns.find(c => c.primaryKey) ||
                                     targetTable.columns.find(c => c.name === 'id') ||
                                     targetTable.columns[0];

                  if (targetColumn) {

                    // Update the foreign key reference
                    if (column.foreignKey) {
                      column.foreignKey.tableId = targetTable.id;
                      column.foreignKey.columnId = targetColumn.id;
                    }

                    // Create relationship - determine type based on Django field type
                    const isOneToOne = djangoField.oneToOneField !== undefined;
                    const relationshipType = isOneToOne ? 'one-to-one' as RelationshipType : 'many-to-one' as RelationshipType;

                    const relationship: Relationship = {
                      id: `rel_${table.id}_${column.name}_${targetTable.id}_${targetColumn.name}`,
                      sourceTableId: table.id,
                      sourceColumnId: column.id,
                      targetTableId: targetTable.id,
                      targetColumnId: targetColumn.id,
                      type: relationshipType,
                      onDelete: (column.foreignKey?.onDelete || djangoField.oneToOneField?.onDelete) as any,
                      onUpdate: 'CASCADE',
                    };

                    relationships.push(relationship);
                  }
                }
              }
            }
          }
        }
      }
    });
  });

  // Third pass: handle ManyToManyField relationships
  tables.forEach(table => {
    const djangoModel = tableToModelLookup[table.name];
    if (djangoModel) {
      djangoModel.fields.forEach(djangoField => {
        if (djangoField.manyToManyField) {
          const relatedModelName = djangoField.manyToManyField.model;
          const relatedDjangoModel = modelLookup[relatedModelName];

          if (relatedDjangoModel) {
            const targetTableName = relatedDjangoModel.tableName || snakeCase(relatedModelName);
            const targetTable = tables.find(t => t.name === targetTableName);

            if (targetTable) {
              // For M2M, we create a relationship without a specific column
              // In a real implementation, this might need a junction table
              const relationship: Relationship = {
                id: `m2m_${table.id}_${targetTable.id}_${djangoField.name}`,
                sourceTableId: table.id,
                sourceColumnId: '', // M2M doesn't have a specific source column
                targetTableId: targetTable.id,
                targetColumnId: '', // M2M doesn't have a specific target column
                type: 'many-to-many' as RelationshipType,
                name: djangoField.name, // Use the field name as relationship name
              };

              relationships.push(relationship);
            }
          }
        }
      });
    }
  });

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
