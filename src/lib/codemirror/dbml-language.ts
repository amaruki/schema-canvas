import { StreamLanguage, StreamParser, foldService } from '@codemirror/language';
import { EditorState } from '@codemirror/state';

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
    if (stream.match(/^(?:Table|Enum|Ref|Project|Note|as|ref)\b/i)) {
      return 'keyword';
    }
    
    // Handle modifiers
    if (stream.match(/^(?:pk|not null|null|unique|increment)\b/i)) {
      return 'modifier';
    }
    
    // Handle default
    if (stream.match(/^default:/i)) {
      return 'operator';
    }
    
    // Handle data types
    if (stream.match(/^\b(?:int|integer|bigint|smallint|tinyint|serial|bigserial|varchar|char|text|email|phonenumber|string|boolean|bool|date|datetime|timestamp|timestamptz|time|timetz|interval|uuid|json|jsonb|xml|inet|macaddr|decimal|numeric|real|double precision|float|money|bit|varbit)\b/i)) {
      return 'type';
    }
    
    // Handle relation symbols
    if (stream.match(/^[<>-]/)) {
      return 'operator';
    }
    
    // Handle numbers
    if (stream.match(/^\d+/)) {
      return 'number';
    }
    
    // Handle identifiers
    if (stream.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)) {
      return 'variable';
    }
    
    // Handle dots
    if (stream.match(/^\./)) {
      return 'operator';
    }
    
    // Handle braces
    if (stream.match(/^[{}]/)) {
      return 'bracket';
    }
    
    // Default: consume one character
    stream.next();
    return null;
  },
};

// Find foldable blocks in DBML document
function findFoldRanges(state: EditorState) {
  const doc = state.doc;
  const lines = doc.toString().split('\n');
  const foldRanges: Array<{ from: number; to: number }> = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Check if this line starts a foldable block (Table, Enum, Ref, Project)
    const blockMatch = trimmed.match(/^(Table|Enum|Ref|Project)\b/);
    if (blockMatch && trimmed.includes('{')) {
      // Found opening block, find matching closing brace
      let braceCount = 0;
      let startLine = i;
      let endLine = -1;
      let openBraceCol = -1;
      
      for (let j = i; j < lines.length; j++) {
        for (let k = 0; k < lines[j].length; k++) {
          if (lines[j][k] === '{') {
            if (braceCount === 0) {
              openBraceCol = k;
            }
            braceCount++;
          } else if (lines[j][k] === '}') {
            braceCount--;
            if (braceCount === 0) {
              endLine = j;
              break;
            }
          }
        }
        if (endLine !== -1) break;
      }
      
      // Add fold range (from after opening brace to before closing brace)
      if (endLine !== -1 && endLine > startLine) {
        // Calculate position after the opening brace
        const startLineObj = doc.line(startLine + 1);
        const from = startLineObj.from + openBraceCol + 1; // After the {
        
        // Calculate position before the closing brace
        const endLineObj = doc.line(endLine + 1);
        const closeBraceCol = lines[endLine].indexOf('}');
        const to = endLineObj.from + closeBraceCol; // Before the }
        
        if (to > from) {
          foldRanges.push({ from, to });
        }
        i = endLine + 1;
      } else {
        i++;
      }
    } else {
      i++;
    }
  }
  
  return foldRanges;
}

// Fold service for DBML
function dbmlFoldService(state: EditorState, from: number, to: number) {
  const foldRanges = findFoldRanges(state);
  
  // Check if the cursor is within a foldable range
  for (const range of foldRanges) {
    if (from >= range.from && from <= range.to) {
      return { from: range.from, to: range.to };
    }
  }
  
  return null;
}

export function dbml() {
  return StreamLanguage.define(dbmlParser);
}

export { dbmlFoldService, findFoldRanges };

export default dbml;
