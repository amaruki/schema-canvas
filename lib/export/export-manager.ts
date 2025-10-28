import { Schema, ExportOptions } from '@/types/schema';
import { exportToJSON, importFromJSON } from './json-exporter';
import { exportToSQL, SQLDialect } from './sql-exporter';
import { exportToPrisma } from './prisma-exporter';

export class ExportManager {
  static export(schema: Schema, options: ExportOptions): string {
    switch (options.format) {
      case 'json':
        return exportToJSON(schema, options.includePositions);

      case 'sql':
        return exportToSQL(schema, options.sqlDialect || 'postgresql');

      case 'prisma':
        return exportToPrisma(schema);

      case 'django':
        return this.exportToDjango(schema);

      case 'laravel':
        return this.exportToLaravel(schema);

      case 'typeorm':
        return this.exportToTypeORM(schema);

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }
  }

  static import(content: string, format: 'json'): Schema {
    switch (format) {
      case 'json':
        return importFromJSON(content);

      default:
        throw new Error(`Unsupported import format: ${format}`);
    }
  }

  static downloadFile(content: string, filename: string, mimeType: string = 'text/plain') {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  private static exportToDjango(schema: Schema): string {
    const lines: string[] = [];

    lines.push('from django.db import models');
    lines.push('from django.utils import timezone');
    lines.push('');

    for (const table of schema.tables) {
      const modelName = this.toPascalCase(table.name);
      lines.push(`class ${modelName}(models.Model):`);

      // Add class docstring if description exists
      if (table.description) {
        lines.push(`    """${table.description}"""`);
      }

      // Add fields
      for (const column of table.columns) {
        const fieldName = this.toSnakeCase(column.name);
        const djangoField = this.mapToDjangoField(column);
        lines.push(`    ${fieldName} = ${djangoField}`);

        // Add field comment if description exists
        if (column.description) {
          lines.push(`    # ${column.description}`);
        }
      }

      // Add string representation
      const nameField = table.columns.find(c => c.name.toLowerCase().includes('name'));
      if (nameField) {
        lines.push(`    def __str__(self):`);
        lines.push(`        return str(self.${this.toSnakeCase(nameField.name)})`);
      } else {
        lines.push(`    def __str__(self):`);
        lines.push(`        return f"${modelName}(id={self.id})"`);
      }

      lines.push('');

      // Add Meta class
      lines.push(`    class Meta:`);
      lines.push(`        db_table = '${table.name}'`);
      lines.push('');
    }

    return lines.join('\n');
  }

  private static exportToLaravel(schema: Schema): string {
    const migrations: string[] = [];

    migrations.push('<?php');
    migrations.push('');
    migrations.push('use Illuminate\\Database\\Migrations\\Migration;');
    migrations.push('use Illuminate\\Database\\Schema\\Blueprint;');
    migrations.push('use Illuminate\\Support\\Facades\\Schema;');
    migrations.push('');

    for (const table of schema.tables) {
      const tableName = this.toSnakeCase(table.name);
      const className = this.toPascalCase(table.name);

      migrations.push(`return new class extends Migration`);
      migrations.push('{');
      migrations.push('    /**');
      migrations.push('     * Run the migrations.');
      migrations.push('     */');
      migrations.push('    public function up(): void');
      migrations.push('    {');
      migrations.push(`        Schema::create('${tableName}', function (Blueprint $table) {`);

      for (const column of table.columns) {
        const laravelColumn = this.mapToLaravelColumn(column);
        migrations.push(`            $table->${laravelColumn};`);
      }

      migrations.push('        });');
      migrations.push('    }');
      migrations.push('');
      migrations.push('    /**');
      migrations.push('     * Reverse the migrations.');
      migrations.push('     */');
      migrations.push('    public function down(): void');
      migrations.push('    {');
      migrations.push(`        Schema::dropIfExists('${tableName}');`);
      migrations.push('    }');
      migrations.push('};');
      migrations.push('');
    }

    return migrations.join('\n');
  }

  private static exportToTypeORM(schema: Schema): string {
    const lines: string[] = [];

    lines.push('import {');
    lines.push('    Entity,');
    lines.push('    PrimaryGeneratedColumn,');
    lines.push('    Column,');
    lines.push('    CreateDateColumn,');
    lines.push('    UpdateDateColumn,');
    lines.push('    ManyToOne,');
    lines.push('    OneToMany,');
    lines.push('    JoinColumn,');
    lines.push('} from "typeorm";');
    lines.push('');

    for (const table of schema.tables) {
      const entityName = this.toPascalCase(table.name);
      lines.push(`@Entity()`);
      lines.push(`export class ${entityName} {`);

      for (const column of table.columns) {
        const propertyName = this.toCamelCase(column.name);
        const typeORMColumn = this.mapToTypeORMColumn(column);
        lines.push(`    ${typeORMColumn}`);
      }

      lines.push('}');
      lines.push('');
    }

    return lines.join('\n');
  }

  // Helper methods
  private static toPascalCase(str: string): string {
    return str
      .split(/[_\s-]/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join('');
  }

  private static toSnakeCase(str: string): string {
    return str
      .replace(/([A-Z])/g, '_$1')
      .replace(/^_/, '')
      .toLowerCase();
  }

  private static toCamelCase(str: string): string {
    return str
      .replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
  }

  private static mapToDjangoField(column: any): string {
    let fieldDef = '';

    switch (column.type) {
      case 'string':
        fieldDef = `models.CharField(max_length=255)`;
        break;
      case 'text':
        fieldDef = `models.TextField()`;
        break;
      case 'integer':
        fieldDef = `models.IntegerField()`;
        break;
      case 'bigint':
        fieldDef = `models.BigIntegerField()`;
        break;
      case 'float':
        fieldDef = `models.FloatField()`;
        break;
      case 'decimal':
        fieldDef = `models.DecimalField(max_digits=10, decimal_places=2)`;
        break;
      case 'boolean':
        fieldDef = `models.BooleanField()`;
        break;
      case 'date':
        fieldDef = `models.DateField()`;
        break;
      case 'datetime':
      case 'timestamp':
        fieldDef = `models.DateTimeField(auto_now_add=True)`;
        break;
      case 'time':
        fieldDef = `models.TimeField()`;
        break;
      case 'json':
        fieldDef = `models.JSONField()`;
        break;
      case 'uuid':
        fieldDef = `models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)`;
        break;
      case 'binary':
        fieldDef = `models.BinaryField()`;
        break;
      default:
        fieldDef = `models.CharField(max_length=255)`;
    }

    // Add modifiers
    if (column.primaryKey && column.type !== 'uuid') {
      fieldDef = `models.AutoField(primary_key=True)`;
    }

    if (column.unique && !column.primaryKey) {
      fieldDef = fieldDef.replace(')', ', unique=True)');
    }

    if (!column.nullable && !column.primaryKey) {
      fieldDef = fieldDef.replace(')', ', blank=False)');
    }

    if (column.nullable && !column.primaryKey) {
      fieldDef = fieldDef.replace(')', ', null=True, blank=True)');
    }

    if (column.defaultValue) {
      if (column.defaultValue.toLowerCase() === 'uuid_generate_v4()') {
        // Already handled in UUID field
      } else if (column.defaultValue.toLowerCase().includes('now')) {
        // Already handled in timestamp fields
      } else if (!isNaN(Number(column.defaultValue))) {
        fieldDef = fieldDef.replace(')', `, default=${column.defaultValue})`);
      } else if (column.defaultValue.toLowerCase() === 'true' || column.defaultValue.toLowerCase() === 'false') {
        fieldDef = fieldDef.replace(')', `, default=${column.defaultValue})`);
      } else {
        fieldDef = fieldDef.replace(')', `, default="${column.defaultValue}")`);
      }
    }

    return fieldDef;
  }

  private static mapToLaravelColumn(column: any): string {
    let laravelDef = '';

    switch (column.type) {
      case 'string':
        laravelDef = `string('${column.name}')`;
        break;
      case 'text':
        laravelDef = `text('${column.name}')`;
        break;
      case 'integer':
        laravelDef = column.primaryKey ? 'id()' : `integer('${column.name}')`;
        break;
      case 'bigint':
        laravelDef = `bigInteger('${column.name}')`;
        break;
      case 'float':
        laravelDef = `float('${column.name}')`;
        break;
      case 'decimal':
        laravelDef = `decimal('${column.name}', 10, 2)`;
        break;
      case 'boolean':
        laravelDef = `boolean('${column.name}')`;
        break;
      case 'date':
        laravelDef = `date('${column.name}')`;
        break;
      case 'datetime':
      case 'timestamp':
        laravelDef = `timestamp('${column.name}')`;
        break;
      case 'time':
        laravelDef = `time('${column.name}')`;
        break;
      case 'json':
        laravelDef = `json('${column.name}')`;
        break;
      case 'uuid':
        laravelDef = `uuid('${column.name}')`;
        break;
      case 'binary':
        laravelDef = `binary('${column.name}')`;
        break;
      default:
        laravelDef = `string('${column.name}')`;
    }

    // Add modifiers
    if (column.nullable) {
      laravelDef += '->nullable()';
    }

    if (column.unique && !column.primaryKey) {
      laravelDef += '->unique()';
    }

    if (column.defaultValue) {
      if (column.defaultValue.toLowerCase() === 'uuid_generate_v4()') {
        laravelDef = `uuid('${column.name}')->default((\\Illuminate\\Support\\Str::uuid()))`;
      } else if (column.defaultValue.toLowerCase().includes('now')) {
        laravelDef += '->useCurrent()';
      } else if (!isNaN(Number(column.defaultValue))) {
        laravelDef += `->default(${column.defaultValue})`;
      } else if (column.defaultValue.toLowerCase() === 'true' || column.defaultValue.toLowerCase() === 'false') {
        laravelDef += `->default(${column.defaultValue})`;
      } else {
        laravelDef += `->default('${column.defaultValue}')`;
      }
    }

    return laravelDef;
  }

  private static mapToTypeORMColumn(column: any): string {
    let columnDef = '';

    switch (column.type) {
      case 'string':
        columnDef = `@Column({ type: "varchar" })\n    ${this.toCamelCase(column.name)}: string;`;
        break;
      case 'text':
        columnDef = `@Column({ type: "text" })\n    ${this.toCamelCase(column.name)}: string;`;
        break;
      case 'integer':
        columnDef = column.primaryKey
          ? `@PrimaryGeneratedColumn()\n    id: number;`
          : `@Column({ type: "int" })\n    ${this.toCamelCase(column.name)}: number;`;
        break;
      case 'bigint':
        columnDef = `@Column({ type: "bigint" })\n    ${this.toCamelCase(column.name)}: number;`;
        break;
      case 'float':
        columnDef = `@Column({ type: "float" })\n    ${this.toCamelCase(column.name)}: number;`;
        break;
      case 'decimal':
        columnDef = `@Column({ type: "decimal", precision: 10, scale: 2 })\n    ${this.toCamelCase(column.name)}: number;`;
        break;
      case 'boolean':
        columnDef = `@Column({ type: "boolean" })\n    ${this.toCamelCase(column.name)}: boolean;`;
        break;
      case 'date':
        columnDef = `@Column({ type: "date" })\n    ${this.toCamelCase(column.name)}: Date;`;
        break;
      case 'datetime':
      case 'timestamp':
        columnDef = `@CreateDateColumn()\n    createdAt: Date;\n    @UpdateDateColumn()\n    updatedAt: Date;`;
        break;
      case 'time':
        columnDef = `@Column({ type: "time" })\n    ${this.toCamelCase(column.name)}: Date;`;
        break;
      case 'json':
        columnDef = `@Column({ type: "json" })\n    ${this.toCamelCase(column.name)}: any;`;
        break;
      case 'uuid':
        columnDef = `@Column({ type: "uuid" })\n    ${this.toCamelCase(column.name)}: string;`;
        break;
      case 'binary':
        columnDef = `@Column({ type: "blob" })\n    ${this.toCamelCase(column.name)}: Buffer;`;
        break;
      default:
        columnDef = `@Column({ type: "varchar" })\n    ${this.toCamelCase(column.name)}: string;`;
    }

    if (!column.nullable && !column.primaryKey) {
      columnDef = columnDef.replace(')', ', nullable: false })');
    }

    if (column.unique && !column.primaryKey) {
      columnDef = columnDef.replace(')', ', unique: true })');
    }

    if (column.defaultValue) {
      columnDef = columnDef.replace(')', `, default: () => "${column.defaultValue}" })`);
    }

    return columnDef;
  }
}