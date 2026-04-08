"use client";

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { EditorState, Extension } from '@codemirror/state';
import { EditorView, lineNumbers, keymap, ViewUpdate } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { dbml, dbmlFoldService, findFoldRanges } from '@/lib/codemirror/dbml-language';
import { lintGutter, setDiagnostics } from '@codemirror/lint';
import { closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { bracketMatching, foldGutter, foldKeymap, foldAll, unfoldAll, foldService } from '@codemirror/language';
import { search, openSearchPanel, closeSearchPanel, searchKeymap } from '@codemirror/search';
import { darkTheme, lightTheme } from '@/lib/codemirror/themes';
import { dbmlAutocomplete } from '@/lib/codemirror/dbml-autocomplete';
import type { ParseError } from '@/lib/dbml/dbml-parser';
import { Button } from '@/components/ui/button';
import { WrapText, Search, FoldVertical, UnfoldVertical } from 'lucide-react';

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
  const [wordWrap, setWordWrap] = useState(true);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Keep the ref updated with the latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Toggle word wrap
  const toggleWordWrap = useCallback(() => {
    setWordWrap(prev => !prev);
  }, []);

  // Toggle search panel
  const toggleSearch = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    
    if (isSearchOpen) {
      // Close search panel by focusing elsewhere
      view.contentDOM.blur();
    } else {
      openSearchPanel(view);
    }
    setIsSearchOpen(!isSearchOpen);
  }, [isSearchOpen]);

  // Fold all blocks
  const foldAllBlocks = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    foldAll(view);
  }, []);

  // Unfold all blocks
  const unfoldAllBlocks = useCallback(() => {
    const view = viewRef.current;
    if (!view) return;
    unfoldAll(view);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    // Custom fold range finder for the gutter
    const findFoldRangesForGutter = (view: EditorView, from: number, to: number) => {
      const allRanges = findFoldRanges(view.state);
      // Return ranges that intersect with the visible range
      return allRanges.filter(range => {
        const lineFrom = view.state.doc.lineAt(range.from).number;
        const lineTo = view.state.doc.lineAt(range.to).number;
        const visibleFrom = view.state.doc.lineAt(from).number;
        const visibleTo = view.state.doc.lineAt(to).number;
        return (lineFrom >= visibleFrom && lineFrom <= visibleTo) ||
               (lineTo >= visibleFrom && lineTo <= visibleTo);
      });
    };

    const extensions: Extension[] = [
      lineNumbers(),
      lintGutter(),
      foldGutter({
        markerDOM: (open) => {
          const marker = document.createElement('div');
          marker.className = 'cm-foldGutterMarker';
          marker.textContent = open ? '▶' : '▼';
          return marker;
        },
      }),
      foldService.of(dbmlFoldService),
      history(),
      bracketMatching(),
      closeBrackets(),
      dbml(),
      dbmlAutocomplete(),
      search({
        top: true,
      }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...foldKeymap,
        ...searchKeymap,
        indentWithTab
      ]),
      wordWrap ? EditorView.lineWrapping : [],
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
      }),
      ...(theme === 'dark' ? darkTheme.extension : lightTheme.extension),
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
  }, [theme, wordWrap]);

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
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1.5 border-b border-border bg-muted/30 shrink-0">
        <Button
          variant={wordWrap ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleWordWrap}
          className="h-7 w-7"
          title="Toggle Word Wrap"
        >
          <WrapText className="h-4 w-4" />
        </Button>
        <Button
          variant={isSearchOpen ? "secondary" : "ghost"}
          size="icon"
          onClick={toggleSearch}
          className="h-7 w-7"
          title="Search (Ctrl+F)"
        >
          <Search className="h-4 w-4" />
        </Button>
        <div className="w-px h-4 bg-border mx-1" />
        <Button
          variant="ghost"
          size="icon"
          onClick={foldAllBlocks}
          className="h-7 w-7"
          title="Fold All Blocks"
        >
          <FoldVertical className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={unfoldAllBlocks}
          className="h-7 w-7"
          title="Unfold All Blocks"
        >
          <UnfoldVertical className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Editor */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto text-sm font-mono [&_.cm-editor]:h-full [&_.cm-editor]:outline-none [&_.cm-scroller]:overflow-auto [&_.cm-panels]:bg-background [&_.cm-panels]:border-b [&_.cm-panels]:border-border [&_.cm-panel]:p-3 [&_.cm-panel_search]:bg-muted/20 [&_.cm-panel_search]:rounded-md [&_.cm-panel_search]:m-2 [&_.cm-textfield]:bg-background [&_.cm-textfield]:border-border [&_.cm-textfield]:rounded [&_.cm-textfield]:px-2 [&_.cm-textfield]:py-1 [&_.cm-button]:bg-primary [&_.cm-button]:text-primary-foreground [&_.cm-button]:border-0 [&_.cm-button]:rounded [&_.cm-button]:px-3 [&_.cm-button]:py-1 [&_.cm-button]:cursor-pointer [&_.cm-button:hover]:bg-primary/90 [&_.cm-completionLabel]:text-foreground"
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
