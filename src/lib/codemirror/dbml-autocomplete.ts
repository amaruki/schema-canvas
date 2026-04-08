import { autocompletion, CompletionContext, Completion, CompletionResult } from '@codemirror/autocomplete';

// Common SQL data types for autocomplete
const DATA_TYPES: Completion[] = [
  // Integer types
  { label: 'int', type: 'type', detail: 'Integer', info: 'Standard integer type' },
  { label: 'integer', type: 'type', detail: 'Integer', info: 'Standard integer type (alias for int)' },
  { label: 'bigint', type: 'type', detail: 'Big Integer', info: 'Large integer type' },
  { label: 'smallint', type: 'type', detail: 'Small Integer', info: 'Small-range integer' },
  { label: 'tinyint', type: 'type', detail: 'Tiny Integer', info: 'Very small integer' },
  { label: 'serial', type: 'type', detail: 'Auto-increment Integer', info: 'Auto-incrementing integer (PostgreSQL)' },
  { label: 'bigserial', type: 'type', detail: 'Auto-increment BigInt', info: 'Auto-incrementing big integer (PostgreSQL)' },
  
  // String types
  { label: 'varchar', type: 'type', detail: 'Variable Character', info: 'Variable-length string with max length' },
  { label: 'char', type: 'type', detail: 'Character', info: 'Fixed-length character string' },
  { label: 'text', type: 'type', detail: 'Text', info: 'Unlimited length text' },
  { label: 'nvarchar', type: 'type', detail: 'Unicode Variable Character', info: 'Unicode variable-length string' },
  
  // Boolean
  { label: 'boolean', type: 'type', detail: 'Boolean', info: 'True/false value' },
  { label: 'bool', type: 'type', detail: 'Boolean', info: 'True/false value (alias)' },
  
  // Date/Time types
  { label: 'date', type: 'type', detail: 'Date', info: 'Calendar date (year, month, day)' },
  { label: 'timestamp', type: 'type', detail: 'Timestamp', info: 'Date and time without timezone' },
  { label: 'timestamptz', type: 'type', detail: 'Timestamp with TZ', info: 'Date and time with timezone' },
  { label: 'time', type: 'type', detail: 'Time', info: 'Time of day without timezone' },
  { label: 'timetz', type: 'type', detail: 'Time with TZ', info: 'Time of day with timezone' },
  { label: 'datetime', type: 'type', detail: 'DateTime', info: 'Date and time combined' },
  { label: 'interval', type: 'type', detail: 'Interval', info: 'Time interval' },
  
  // Numeric types
  { label: 'decimal', type: 'type', detail: 'Decimal', info: 'Exact numeric with precision' },
  { label: 'numeric', type: 'type', detail: 'Numeric', info: 'Exact numeric with precision (alias)' },
  { label: 'float', type: 'type', detail: 'Float', info: 'Approximate numeric' },
  { label: 'real', type: 'type', detail: 'Real', info: 'Single-precision float' },
  { label: 'double precision', type: 'type', detail: 'Double Precision', info: 'Double-precision float' },
  { label: 'money', type: 'type', detail: 'Currency', info: 'Currency amount' },
  
  // JSON/XML
  { label: 'json', type: 'type', detail: 'JSON', info: 'JSON data in text form' },
  { label: 'jsonb', type: 'type', detail: 'JSON Binary', info: 'JSON in binary form (PostgreSQL)' },
  { label: 'xml', type: 'type', detail: 'XML', info: 'XML data' },
  
  // Other types
  { label: 'uuid', type: 'type', detail: 'UUID', info: 'Universally unique identifier' },
  { label: 'inet', type: 'type', detail: 'IP Address', info: 'IPv4 or IPv6 address' },
  { label: 'macaddr', type: 'type', detail: 'MAC Address', info: 'MAC address' },
  { label: 'bit', type: 'type', detail: 'Bit String', info: 'Fixed-length bit string' },
  { label: 'varbit', type: 'type', detail: 'Variable Bit', info: 'Variable-length bit string' },
];

// Field modifiers
const MODIFIERS: Completion[] = [
  { label: 'pk', type: 'keyword', detail: 'Primary Key', info: 'Set as primary key', apply: 'pk' },
  { label: 'not null', type: 'keyword', detail: 'Not Null', info: 'Cannot be null', apply: 'not null' },
  { label: 'null', type: 'keyword', detail: 'Nullable', info: 'Can be null', apply: 'null' },
  { label: 'unique', type: 'keyword', detail: 'Unique', info: 'Must be unique', apply: 'unique' },
  { label: 'increment', type: 'keyword', detail: 'Auto Increment', info: 'Auto-increment value', apply: 'increment' },
  { label: 'default:', type: 'keyword', detail: 'Default Value', info: 'Set default value', apply: 'default: ' },
];

// Snippet completions for DBML blocks
const SNIPPETS: Completion[] = [
  {
    label: 'Table',
    type: 'snippet',
    detail: 'Table Block',
    info: 'Create a new table definition',
    apply: 'Table ${name} {\n  ${fields}\n}',
  },
  {
    label: 'Enum',
    type: 'snippet',
    detail: 'Enum Block',
    info: 'Create a new enum definition',
    apply: 'Enum ${name} {\n  ${values}\n}',
  },
  {
    label: 'Ref',
    type: 'snippet',
    detail: 'Reference Block',
    info: 'Create a new relationship reference',
    apply: 'Ref {\n  ${source_table}.${source_field} ${relation} ${target_table}.${target_field}\n}',
  },
  {
    label: 'Project',
    type: 'snippet',
    detail: 'Project Block',
    info: 'Create a project metadata block',
    apply: 'Project ${name} {\n  Note: \'${description}\'\n}',
  },
];

// Extract table names from the document
function extractTableNames(doc: string): string[] {
  const tableRegex = /Table\s+(\w+)/g;
  const tables: string[] = [];
  let match;
  while ((match = tableRegex.exec(doc)) !== null) {
    tables.push(match[1]);
  }
  return [...new Set(tables)]; // Remove duplicates
}

// Extract field names from a specific table
function extractFieldNames(doc: string, tableName: string): string[] {
  const tableRegex = new RegExp(`Table\\s+${tableName}\\s*\\{([^}]+)\\}`, 's');
  const match = tableRegex.exec(doc);
  if (!match) return [];
  
  const tableBody = match[1];
  const fieldRegex = /^\s*(\w+)\s+/gm;
  const fields: string[] = [];
  let fieldMatch;
  while ((fieldMatch = fieldRegex.exec(tableBody)) !== null) {
    fields.push(fieldMatch[1]);
  }
  return [...new Set(fields)];
}

// Determine the current context for smart completions
function getContextAtCursor(doc: string, pos: number): {
  context: 'table-name' | 'field-name' | 'field-type' | 'ref-table' | 'ref-field' | 'modifier' | 'snippet';
  tableName?: string;
} {
  const textBefore = doc.substring(0, pos);
  const lines = textBefore.split('\n');
  const currentLine = lines[lines.length - 1];
  const trimmedLine = currentLine.trim();
  
  // Check if we're at the start of a line (possible snippet context)
  if (trimmedLine === '' || trimmedLine.match(/^(Table|Enum|Ref|Project)?$/)) {
    return { context: 'snippet' };
  }
  
  // Check if we're after "Table" keyword (table name context)
  if (trimmedLine.match(/^Table\s+\w*$/)) {
    return { context: 'table-name' };
  }
  
  // Check if we're inside a table definition
  const tableMatch = textBefore.match(/Table\s+(\w+)\s*\{[^}]*$/);
  if (tableMatch) {
    const tableName = tableMatch[1];
    // Check if we're after a field name (type context)
    const fieldMatch = currentLine.match(/^\s*\w+\s+(\w*)$/);
    if (fieldMatch) {
      return { context: 'field-type', tableName };
    }
    // Check if we're typing a field name
    if (currentLine.match(/^\s+\w*$/)) {
      return { context: 'field-name', tableName };
    }
    // Otherwise might be typing modifiers
    return { context: 'modifier', tableName };
  }
  
  // Check if we're in a Ref block
  if (textBefore.match(/Ref\s*\{[^}]*$/)) {
    // Check if we're typing a table reference
    if (currentLine.match(/(\w*)\.\w*$/)) {
      return { context: 'ref-table' };
    }
    if (currentLine.match(/\w+\.(\w*)$/)) {
      return { context: 'ref-field' };
    }
  }
  
  return { context: 'snippet' };
}

// Main completion function
function dbmlCompletions(context: CompletionContext): CompletionResult | null {
  const word = context.matchBefore(/\w*/);
  if (!word || (word.from === word.to && !context.explicit)) {
    return null;
  }
  
  const doc = context.state.doc.toString();
  const pos = context.pos;
  const ctx = getContextAtCursor(doc, pos);
  
  let completions: Completion[] = [];
  
  switch (ctx.context) {
    case 'table-name':
      // No specific completions for table names (user types freely)
      completions = [];
      break;
      
    case 'field-name':
      // Field names are user-defined, no autocomplete
      completions = [];
      break;
      
    case 'field-type':
      // Suggest data types
      completions = DATA_TYPES;
      break;
      
    case 'modifier':
      // Suggest modifiers
      completions = MODIFIERS;
      break;
      
    case 'ref-table':
      // Suggest existing table names
      const tableNames = extractTableNames(doc);
      completions = tableNames.map(name => ({
        label: name,
        type: 'variable',
        detail: 'Table',
        info: `Reference table: ${name}`,
      }));
      break;
      
    case 'ref-field':
      // Extract field names from the referenced table
      const refTableMatch = context.state.doc.toString().substring(0, pos).match(/(\w+)\.\w*$/);
      if (refTableMatch) {
        const tableName = refTableMatch[1];
        const fields = extractFieldNames(doc, tableName);
        completions = fields.map(field => ({
          label: field,
          type: 'property',
          detail: 'Field',
          info: `Field in ${tableName}`,
        }));
      } else {
        completions = DATA_TYPES;
      }
      break;
      
    case 'snippet':
    default:
      // Show snippets and common keywords
      completions = [...SNIPPETS, ...DATA_TYPES.slice(0, 10)];
      break;
  }
  
  if (completions.length === 0) {
    return null;
  }
  
  return {
    from: word.from,
    options: completions,
    validFor: /^\w*$/,
  };
}

// Export the autocomplete extension
export function dbmlAutocomplete() {
  return autocompletion({
    override: [dbmlCompletions],
    activateOnTyping: true,
    defaultKeymap: true,
    aboveCursor: false,
    icons: true,
  });
}

export { DATA_TYPES, MODIFIERS, SNIPPETS };
