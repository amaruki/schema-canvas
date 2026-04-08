import { StreamLanguage, StreamParser } from '@codemirror/language';

interface DBMLState {
  inNote: boolean;
}

const dbmlParser: StreamParser<DBMLState> = {
  name: 'dbml',
  startState: () => ({ inNote: false }),
  token: (stream, state) => {
    // Handle multi-line note strings
    if (state.inNote) {
      if (stream.match("'''")) {
        state.inNote = false;
        return 'string';
      }
      stream.next();
      return 'string';
    }
    
    // Check for start of multi-line note
    if (stream.match("'''")) {
      state.inNote = true;
      return 'string';
    }
    
    // Skip whitespace
    if (stream.eatSpace()) return null;
    
    // Handle comments
    if (stream.match('//')) {
      stream.skipToEnd();
      return 'comment';
    }
    
    // Handle single-line strings
    if (stream.match("'")) {
      while (!stream.eol()) {
        if (stream.match("'")) break;
        stream.next();
      }
      return 'string';
    }
    
    if (stream.match('"')) {
      while (!stream.eol()) {
        if (stream.match('"')) break;
        stream.next();
      }
      return 'string';
    }
    
    // Handle keywords
    if (stream.match(/Table|Enum|Ref|Project|Note|as/)) {
      return 'keyword';
    }
    
    // Handle modifiers
    if (stream.match(/pk|not null|null|unique|increment/)) {
      return 'modifier';
    }
    
    // Handle default
    if (stream.match(/default:/)) {
      return 'operator';
    }
    
    // Handle data types
    if (stream.match(/\b(int|integer|bigint|smallint|tinyint|serial|bigserial|varchar|char|text|boolean|bool|date|timestamp|timestamptz|time|timetz|interval|uuid|json|jsonb|xml|inet|macaddr|decimal|numeric|real|double precision|float|money|bit|varbit)\b/i)) {
      return 'type';
    }
    
    // Handle relation symbols
    if (stream.match(/[<>-]/)) {
      return 'operator';
    }
    
    // Handle numbers
    if (stream.match(/\d+/)) {
      return 'number';
    }
    
    // Handle identifiers
    if (stream.match(/[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return 'variable';
    }
    
    // Handle dots
    if (stream.match(/\./)) {
      return 'operator';
    }
    
    // Handle braces
    if (stream.match(/[{}]/)) {
      return 'bracket';
    }
    
    // Default: consume one character
    stream.next();
    return null;
  },
};

export function dbml() {
  return StreamLanguage.define(dbmlParser);
}

export default dbml;
