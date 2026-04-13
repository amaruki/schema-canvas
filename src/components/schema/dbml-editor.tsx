"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { EditorState, Extension } from "@codemirror/state";
import { EditorView, lineNumbers, keymap, ViewUpdate } from "@codemirror/view";
import {
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
} from "@codemirror/commands";
import {
  dbml,
  dbmlFoldService,
  findFoldRanges,
} from "@/lib/codemirror/dbml-language";
import { lintGutter, setDiagnostics } from "@codemirror/lint";
import { closeBrackets, closeBracketsKeymap } from "@codemirror/autocomplete";
import {
  bracketMatching,
  foldGutter,
  foldKeymap,
  foldAll,
  unfoldAll,
  foldService,
} from "@codemirror/language";
import {
  search,
  openSearchPanel,
  closeSearchPanel,
  setSearchQuery as setCMSearchQuery,
  SearchQuery,
  findNext,
  findPrevious,
  replaceNext,
  replaceAll,
} from "@codemirror/search";
import { darkTheme, lightTheme } from "@/lib/codemirror/themes";
import { dbmlAutocomplete } from "@/lib/codemirror/dbml-autocomplete";
import type { ParseError } from "@/lib/dbml/dbml-parser";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  WrapText,
  Search,
  FoldVertical,
  UnfoldVertical,
  Code2,
  CheckCircle2,
  AlertCircle,
  Settings2,
  ChevronUp,
  ChevronDown,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface DbmlEditorProps {
  value: string;
  onChange: (val: string) => void;
  errors: ParseError[];
  theme: "light" | "dark";
}

export const DbmlEditor: React.FC<DbmlEditorProps> = ({
  value,
  onChange,
  errors,
  theme,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const onChangeRef = useRef(onChange);
  const [wordWrap, setWordWrap] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isAdvancedSearch, setIsAdvancedSearch] = useState(false);

  // Custom Search State
  const [searchQuery, setSearchQueryText] = useState("");
  const [replaceQuery, setReplaceQuery] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const [useRegexp, setUseRegexp] = useState(false);
  const [byWord, setByWord] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const isSearchOpenRef = useRef(isSearchOpen);

  // Sync ref
  useEffect(() => {
    isSearchOpenRef.current = isSearchOpen;
  }, [isSearchOpen]);

  // Keep the ref updated with the latest onChange callback
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  // Toggle word wrap
  const toggleWordWrap = useCallback(() => {
    setWordWrap((prev) => !prev);
  }, []);

  // Toggle search panel
  const toggleSearch = useCallback((forceOpen = false) => {
    const view = viewRef.current;
    if (!view) return;

    if (isSearchOpenRef.current && !forceOpen) {
      closeSearchPanel(view);
      setIsSearchOpen(false);
      setIsAdvancedSearch(false);
      view.focus();
    } else {
      openSearchPanel(view);
      setIsSearchOpen(true);
      setTimeout(() => searchInputRef.current?.focus(), 50);

      const selection = view.state.sliceDoc(
        view.state.selection.main.from,
        view.state.selection.main.to,
      );
      if (selection && !selection.includes("\n")) {
        setSearchQueryText(selection);
      }
    }
  }, []);

  const toggleSearchRef = useRef(toggleSearch);
  useEffect(() => {
    toggleSearchRef.current = toggleSearch;
  }, [toggleSearch]);

  // Sync custom search state to CM6 internal search query
  useEffect(() => {
    if (!viewRef.current || !isSearchOpen) return;
    viewRef.current.dispatch({
      effects: setCMSearchQuery.of(
        new SearchQuery({
          search: searchQuery,
          replace: replaceQuery,
          caseSensitive: matchCase,
          regexp: useRegexp,
          wholeWord: byWord,
        }),
      ),
    });
  }, [searchQuery, replaceQuery, matchCase, useRegexp, byWord, isSearchOpen]);

  // Find/Replace Actions
  const doFindNext = () => {
    if (viewRef.current) findNext(viewRef.current);
  };
  const doFindPrev = () => {
    if (viewRef.current) findPrevious(viewRef.current);
  };
  const doReplace = () => {
    if (viewRef.current) replaceNext(viewRef.current);
  };
  const doReplaceAll = () => {
    if (viewRef.current) replaceAll(viewRef.current);
  };

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
    const findFoldRangesForGutter = (
      view: EditorView,
      from: number,
      to: number,
    ) => {
      const allRanges = findFoldRanges(view.state);
      // Return ranges that intersect with the visible range
      return allRanges.filter((range) => {
        const lineFrom = view.state.doc.lineAt(range.from).number;
        const lineTo = view.state.doc.lineAt(range.to).number;
        const visibleFrom = view.state.doc.lineAt(from).number;
        const visibleTo = view.state.doc.lineAt(to).number;
        return (
          (lineFrom >= visibleFrom && lineFrom <= visibleTo) ||
          (lineTo >= visibleFrom && lineTo <= visibleTo)
        );
      });
    };

    const extensions: Extension[] = [
      lineNumbers(),
      lintGutter(),
      foldGutter({
        markerDOM: (open) => {
          const marker = document.createElement("div");
          marker.className = "cm-foldGutterMarker";
          marker.textContent = open ? "▶" : "▼";
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
        createPanel: () => {
          const dom = document.createElement("div");
          dom.style.display = "none";
          return { top: true, dom };
        },
      }),
      keymap.of([
        ...defaultKeymap,
        ...historyKeymap,
        ...closeBracketsKeymap,
        ...foldKeymap,
        {
          key: "Mod-f",
          run: () => {
            toggleSearchRef.current(true);
            return true;
          },
        },
        {
          key: "Escape",
          run: () => {
            if (isSearchOpenRef.current) {
              toggleSearchRef.current(false);
              return true;
            }
            return false;
          },
        },
        indentWithTab,
      ]),
      wordWrap ? EditorView.lineWrapping : [],
      EditorView.updateListener.of((update: ViewUpdate) => {
        if (update.docChanged) {
          onChangeRef.current(update.state.doc.toString());
        }
        // Explicitly force scroll autofocus to active cursor when the user inputs text or moves the cursor
        if (
          update.transactions.some(
            (tr) =>
              tr.isUserEvent("input") ||
              tr.isUserEvent("keyboard") ||
              tr.isUserEvent("delete") ||
              tr.selection,
          )
        ) {
          update.view.dispatch({
            effects: EditorView.scrollIntoView(
              update.state.selection.main.head,
              { y: "nearest", yMargin: 30 },
            ),
          });
        }
      }),
      ...(theme === "dark" ? darkTheme.extension : lightTheme.extension),
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
        severity: "error" as const,
        message: err.message,
      };
    });

    view.dispatch(setDiagnostics(view.state, diagnostics));
  }, [errors]);

  const firstError = errors[0];

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      {/* Header & Toolbar */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-muted/20 shrink-0">
        <div className="flex items-center gap-2">
          <Code2 className="h-4 w-4 text-primary opacity-80" />
          <span className="text-xs font-semibold tracking-wide text-foreground uppercase">
            DBML Source
          </span>

          <div className="mx-2 h-4 w-px bg-border" />

          {errors.length === 0 ? (
            <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3 w-3" />
              <span>Valid</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span>
                {errors.length} Error{errors.length > 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant={wordWrap ? "secondary" : "ghost"}
            size="icon"
            onClick={toggleWordWrap}
            className={cn("h-7 w-7", wordWrap && "shadow-sm")}
            title="Toggle Word Wrap"
          >
            <WrapText className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant={isSearchOpen ? "secondary" : "ghost"}
            size="icon"
            onClick={() => toggleSearch()}
            className={cn("h-7 w-7", isSearchOpen && "shadow-sm")}
            title="Search (Ctrl+F)"
          >
            <Search className="h-3.5 w-3.5" />
          </Button>
          <div className="w-px h-4 bg-border/60 mx-1" />
          <Button
            variant="ghost"
            size="icon"
            onClick={foldAllBlocks}
            className="h-7 w-7 hover:bg-muted"
            title="Fold All Blocks"
          >
            <FoldVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={unfoldAllBlocks}
            className="h-7 w-7 hover:bg-muted"
            title="Unfold All Blocks"
          >
            <UnfoldVertical className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 min-h-0 relative flex flex-col">
        {/* Custom Shadcn Search Panel over the editor */}
        {isSearchOpen && (
          <div className="absolute top-2 right-4 z-50 bg-popover/95 backdrop-blur-sm border border-border shadow-md rounded-md flex flex-col p-2.5 min-w-[340px] text-sm animate-in fade-in slide-in-from-top-2">
            {/* Basic Control Row */}
            <div className="flex items-center gap-1.5 w-full">
              <Input
                ref={searchInputRef}
                value={searchQuery}
                onChange={(e) => setSearchQueryText(e.target.value)}
                placeholder="Find..."
                className="h-7 text-xs flex-1 min-w-[120px]"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    if (e.shiftKey) doFindPrev();
                    else doFindNext();
                  }
                  if (e.key === "Escape") {
                    toggleSearch(false);
                  }
                }}
              />
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={doFindPrev}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
                onClick={doFindNext}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={isAdvancedSearch ? "secondary" : "ghost"}
                size="icon"
                className={cn(
                  "h-7 w-7 ml-1",
                  isAdvancedSearch && "bg-secondary text-secondary-foreground",
                )}
                onClick={() => setIsAdvancedSearch(!isAdvancedSearch)}
                title="Toggle Advanced"
              >
                <ChevronDown
                  className={cn(
                    "h-4 w-4 transition-transform text-muted-foreground",
                    isAdvancedSearch && "rotate-180 text-foreground",
                  )}
                />
              </Button>
              <div className="w-px h-4 bg-border/60 mx-0.5" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                onClick={() => toggleSearch(false)}
                title="Close (Esc)"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            {/* Advanced / Replace Row */}
            {isAdvancedSearch && (
              <div className="flex flex-col gap-2mt-0 pt-2 border-t border-border mt-2">
                <div className="flex items-center gap-1.5 w-full">
                  <Input
                    value={replaceQuery}
                    onChange={(e) => setReplaceQuery(e.target.value)}
                    placeholder="Replace..."
                    className="h-7 text-xs flex-1 min-w-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (e.shiftKey) doReplaceAll();
                        else doReplace();
                      }
                      if (e.key === "Escape") toggleSearch(false);
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-[11px] font-medium"
                    onClick={doReplace}
                  >
                    Replace
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-3 text-[11px] font-medium"
                    onClick={doReplaceAll}
                  >
                    All
                  </Button>
                </div>

                {/* Search Options */}
                <div className="flex items-center gap-4 px-1 mt-2.5 mb-1 text-muted-foreground">
                  <label className="flex items-center gap-1.5 text-[11px] hover:text-foreground cursor-pointer transition-colors">
                    <Checkbox
                      checked={matchCase}
                      onCheckedChange={(c) => setMatchCase(!!c)}
                      className="w-3.5 h-3.5 rounded-[2px]"
                    />
                    Match Case
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] hover:text-foreground cursor-pointer transition-colors">
                    <Checkbox
                      checked={byWord}
                      onCheckedChange={(c) => setByWord(!!c)}
                      className="w-3.5 h-3.5 rounded-[2px]"
                    />
                    Whole Word
                  </label>
                  <label className="flex items-center gap-1.5 text-[11px] hover:text-foreground cursor-pointer transition-colors">
                    <Checkbox
                      checked={useRegexp}
                      onCheckedChange={(c) => setUseRegexp(!!c)}
                      className="w-3.5 h-3.5 rounded-[2px]"
                    />
                    RegExp
                  </label>
                </div>
              </div>
            )}
          </div>
        )}

        <div
          ref={containerRef}
          className={cn(
            "flex-1 min-h-0 text-sm font-mono relative",
            "[&_.cm-editor]:flex [&_.cm-editor]:flex-col [&_.cm-editor]:h-full [&_.cm-editor]:outline-none",
            "[&_.cm-scroller]:flex-1 [&_.cm-scroller]:overflow-auto [&_.cm-content]:pb-16",
            "[&_.cm-completionLabel]:text-foreground",
          )}
        />
      </div>
      {firstError && (
        <div className="bg-destructive/10 text-destructive text-xs px-3 py-1.5 border-t border-destructive/20 shrink-0">
          {firstError.line != null ? `Line ${firstError.line}: ` : ""}
          {firstError.message}
        </div>
      )}
    </div>
  );
};

export default DbmlEditor;
