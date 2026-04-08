import { EditorView } from '@codemirror/view';
import { HighlightStyle, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';

// VS Code Dark+ colors
const darkColors = {
  bg: '#1e1e1e',
  bgSecondary: '#252526',
  bgTertiary: '#2d2d2d',
  fg: '#d4d4d4',
  fgSecondary: '#858585',
  lineHighlight: '#2a2d2e',
  selection: '#264f78',
  selectionHighlight: '#264f7880',
  cursor: '#aeafad',
  gutterBg: '#1e1e1e',
  gutterFg: '#858585',
  gutterActiveFg: '#c6c6c6',
  scrollbar: '#424242',
  scrollbarHover: '#4f4f4f',
  // Syntax colors
  keyword: '#569cd6',
  string: '#ce9178',
  number: '#b5cea8',
  comment: '#6a9955',
  function: '#dcdcaa',
  type: '#4ec9b0',
  variable: '#9cdcfe',
  operator: '#d4d4d4',
  punctuation: '#d4d4d4',
  tagName: '#569cd6',
  tag: '#808080',
  attributeName: '#9cdcfe',
  attributeValue: '#ce9178',
  property: '#9cdcfe',
  className: '#4ec9b0',
  regexp: '#d16969',
  meta: '#569cd6',
  heading: '#569cd6',
  link: '#569cd6',
  invalid: '#f44747',
  deleted: '#6a9955',
  inserted: '#b5cea8',
};

// VS Code Light+ colors
const lightColors = {
  bg: '#ffffff',
  bgSecondary: '#f3f3f3',
  bgTertiary: '#e8e8e8',
  fg: '#333333',
  fgSecondary: '#999999',
  lineHighlight: '#e4e6f1',
  selection: '#add6ff',
  selectionHighlight: '#add6ff80',
  cursor: '#000000',
  gutterBg: '#ffffff',
  gutterFg: '#2b2b2b',
  gutterActiveFg: '#000000',
  scrollbar: '#c1c1c1',
  scrollbarHover: '#a8a8a8',
  // Syntax colors
  keyword: '#0000ff',
  string: '#a31515',
  number: '#098658',
  comment: '#008000',
  function: '#795e26',
  type: '#267f99',
  variable: '#001080',
  operator: '#333333',
  punctuation: '#333333',
  tagName: '#800000',
  tag: '#800000',
  attributeName: '#e50000',
  attributeValue: '#0000ff',
  property: '#e50000',
  className: '#267f99',
  regexp: '#811f3f',
  meta: '#0000ff',
  heading: '#0000ff',
  link: '#0000ff',
  invalid: '#cd3131',
  deleted: '#008000',
  inserted: '#098658',
};

function createTheme(colors: typeof darkColors) {
  return EditorView.theme({
    '&': {
      backgroundColor: colors.bg,
      color: colors.fg,
    },
    '&.cm-focused': {
      outline: 'none',
    },
    '.cm-content': {
      caretColor: colors.cursor,
      padding: '4px 0',
    },
    '.cm-cursor': {
      borderLeftColor: colors.cursor,
    },
    '.cm-scroller': {
      lineHeight: '1.5',
      fontFamily: "'Consolas', 'Monaco', 'Courier New', monospace",
      fontSize: '14px',
    },
    '&.cm-focused .cm-selectionBackground, .cm-selectionBackground, .cm-content ::selection': {
      backgroundColor: `${colors.selection} !important`,
    },
    '.cm-selectionMatch': {
      backgroundColor: colors.selectionHighlight,
    },
    '.cm-line': {
      padding: '0 4px',
    },
    '.cm-gutters': {
      backgroundColor: colors.gutterBg,
      color: colors.gutterFg,
      border: 'none',
      borderRight: `1px solid ${colors.bgTertiary}`,
    },
    '.cm-gutterElement': {
      padding: '0 4px',
    },
    '.cm-activeLineGutter': {
      backgroundColor: 'transparent',
      color: colors.gutterActiveFg,
    },
    '.cm-activeLine': {
      backgroundColor: colors.lineHighlight,
    },
    '.cm-foldPlaceholder': {
      backgroundColor: colors.bgTertiary,
      borderColor: colors.bgTertiary,
      color: colors.fgSecondary,
    },
    '.cm-tooltip': {
      backgroundColor: colors.bgSecondary,
      borderColor: colors.bgTertiary,
      color: colors.fg,
    },
    '.cm-tooltip-autocomplete': {
      '& > ul > li[aria-selected]': {
        backgroundColor: colors.selection,
        color: colors.fg,
      },
    },
    '.cm-diagnostic': {
      '&.cm-diagnostic-error': {
        borderColor: '#f44747',
      },
      '&.cm-diagnostic-warning': {
        borderColor: '#cca700',
      },
    },
    '.cm-searchMatch': {
      backgroundColor: '#515c6a40',
      outline: `1px solid ${colors.bgTertiary}`,
    },
    '.cm-searchMatch.cm-searchMatch-selected': {
      backgroundColor: '#515c6a80',
    },
    '.cm-panel label': {
      color: colors.fg,
    },
    '.cm-button': {
      backgroundColor: colors.bgTertiary,
      color: colors.fg,
      borderColor: colors.bgTertiary,
    },
    '.cm-textfield': {
      backgroundColor: colors.bg,
      borderColor: colors.bgTertiary,
      color: colors.fg,
    },
    // DBML StreamLanguage token styles
    '.cm-token-keyword': {
      color: colors.keyword,
      fontWeight: 'bold',
    },
    '.cm-token-modifier': {
      color: colors.keyword,
    },
    '.cm-token-type': {
      color: colors.type,
    },
    '.cm-token-string': {
      color: colors.string,
    },
    '.cm-token-comment': {
      color: colors.comment,
      fontStyle: 'italic',
    },
    '.cm-token-number': {
      color: colors.number,
    },
    '.cm-token-operator': {
      color: colors.operator,
    },
    '.cm-token-variable': {
      color: colors.variable,
    },
    '.cm-token-bracket': {
      color: colors.punctuation,
    },
  });
}

const darkHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier], color: darkColors.keyword },
  { tag: [tags.string, tags.link], color: darkColors.string },
  { tag: [tags.number, tags.inserted], color: darkColors.number },
  { tag: [tags.comment, tags.deleted], color: darkColors.comment },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: darkColors.function },
  { tag: [tags.typeName, tags.className, tags.definition(tags.name), tags.standard(tags.typeName)], color: darkColors.type },
  { tag: [tags.variableName, tags.propertyName, tags.attributeName, tags.name], color: darkColors.variable },
  { tag: [tags.operator, tags.operatorKeyword], color: darkColors.operator },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: darkColors.punctuation },
  { tag: [tags.tagName], color: darkColors.tagName },
  { tag: [tags.attributeValue], color: darkColors.attributeValue },
  { tag: [tags.regexp], color: darkColors.regexp },
  { tag: [tags.meta], color: darkColors.meta },
  { tag: [tags.heading], color: darkColors.heading },
  { tag: [tags.invalid], color: darkColors.invalid, textDecoration: 'underline' },
  { tag: [tags.angleBracket], color: darkColors.tag },
  { tag: [tags.atom], color: darkColors.number },
  { tag: [tags.contentSeparator], color: darkColors.keyword },
  { tag: [tags.labelName], color: darkColors.variable },
  { tag: [tags.quote], color: darkColors.string },
  { tag: [tags.emphasis], color: darkColors.keyword, fontStyle: 'italic' },
  { tag: [tags.strong], color: darkColors.keyword, fontWeight: 'bold' },
  { tag: [tags.escape], color: darkColors.string },
  { tag: [tags.special(tags.string)], color: darkColors.function },
  { tag: [tags.derefOperator], color: darkColors.operator },
]);

const lightHighlightStyle = HighlightStyle.define([
  { tag: [tags.keyword, tags.modifier], color: lightColors.keyword },
  { tag: [tags.string, tags.link], color: lightColors.string },
  { tag: [tags.number, tags.inserted], color: lightColors.number },
  { tag: [tags.comment, tags.deleted], color: lightColors.comment },
  { tag: [tags.function(tags.variableName), tags.function(tags.propertyName)], color: lightColors.function },
  { tag: [tags.typeName, tags.className, tags.definition(tags.name), tags.standard(tags.typeName)], color: lightColors.type },
  { tag: [tags.variableName, tags.propertyName, tags.attributeName, tags.name], color: lightColors.variable },
  { tag: [tags.operator, tags.operatorKeyword], color: lightColors.operator },
  { tag: [tags.punctuation, tags.bracket, tags.separator], color: lightColors.punctuation },
  { tag: [tags.tagName], color: lightColors.tagName },
  { tag: [tags.attributeValue], color: lightColors.attributeValue },
  { tag: [tags.regexp], color: lightColors.regexp },
  { tag: [tags.meta], color: lightColors.meta },
  { tag: [tags.heading], color: lightColors.heading },
  { tag: [tags.invalid], color: lightColors.invalid, textDecoration: 'underline' },
  { tag: [tags.angleBracket], color: lightColors.tag },
  { tag: [tags.atom], color: lightColors.number },
  { tag: [tags.contentSeparator], color: lightColors.keyword },
  { tag: [tags.labelName], color: lightColors.variable },
  { tag: [tags.quote], color: lightColors.string },
  { tag: [tags.emphasis], color: lightColors.keyword, fontStyle: 'italic' },
  { tag: [tags.strong], color: lightColors.keyword, fontWeight: 'bold' },
  { tag: [tags.escape], color: lightColors.string },
  { tag: [tags.special(tags.string)], color: lightColors.function },
  { tag: [tags.derefOperator], color: lightColors.operator },
]);

export const darkTheme = {
  extension: [createTheme(darkColors), syntaxHighlighting(darkHighlightStyle)],
};

export const lightTheme = {
  extension: [createTheme(lightColors), syntaxHighlighting(lightHighlightStyle)],
};
