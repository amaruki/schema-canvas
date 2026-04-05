"use client";

import React, { useEffect, useRef } from 'react';
import { EditorState } from '@codemirror/state';
import { EditorView, lineNumbers, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { oneDark } from '@codemirror/theme-one-dark';
import { sql } from '@codemirror/lang-sql';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, foldGutter, foldKeymap } from '@codemirror/language';
import type { ParseError } from '@/lib/dbml/dbml-parser';

interface DbmlEditorProps {
  value: string;
  onChange: (val: string) => void;
  errors: ParseError[];
  theme: 'light' | 'dark';
}

export const DbmlEditor: React.FC<DbmlEditorProps> = ({ value, onChange, errors, theme }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);

  // Keep the ref updated with the latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!containerRef.current) return;

    const extensions = [
      lineNumbers(),
      lintGutter(),
      foldGutter(),
      history(),
      bracketMatching(),
      closeBrackets(),
      sql(),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...foldKeymap,
        indentWithTab
      ]),
      EditorView.lineWrapping,
      EditorView.updateListener.of((update) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      ...(theme === 'dark' ? [oneDark] : []),
    ];

    const state = EditorState.create({ doc: value, extensions });
    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
    // Recreate editor only on theme change; value sync handled below
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme]);

  // Sync external value changes into the editor without firing onChange
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const current = view.state.doc.toString();
    if (current !== value) {
      view.dispatch({
        changes: { from: 0, to: current.length, insert: value },
      });
    }
  }, [value]);

  // Sync external errors into editor diagnostics
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const diagnostics = errors.map((err) => {
      let from = 0;
      let to = 0;
      if (err.line != null) {
        // CodeMirror lines are 1-based
        const lineNo = Math.max(1, Math.min(err.line, view.state.doc.lines));
        const line = view.state.doc.line(lineNo);
        from = line.from;
        to = line.to;
      } else {
        from = 0;
        to = view.state.doc.length;
      }
      return {
        from,
        to,
        severity: 'error' as const,
        message: err.message,
      };
    });

    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [errors]);

  const firstError = errors[0];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div 
        ref={containerRef} 
        className="flex-1 overflow-auto text-sm font-mono [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto" 
      />
      {firstError && (
        <div className="bg-destructive/10 text-destructive text-xs px-3 py-1.5 border-t border-destructive/20 shrink-0">
          {firstError.line != null ? `Line ${firstError.line}: ` : ''}{firstError.message}
        </div>
      )}
    </div>
  );
};

export default DbmlEditor;
