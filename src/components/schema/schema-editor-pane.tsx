"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTheme } from 'next-themes';
import { parseDbml, type ParseError } from '@/lib/dbml/dbml-parser';
import { serializeToDbml } from '@/lib/dbml/dbml-serializer';
import type { Table, Relationship } from '@/features/schema/types/schema.types';
import type { Node } from '@xyflow/react';
import DbmlEditor from './dbml-editor';

interface SchemaEditorPaneProps {
  isOpen: boolean;
  children: React.ReactNode;
  tables: Table[];
  relationships: Relationship[];
  getNodes: () => Node[];
  onSchemaChange: (tables: Table[], relationships: Relationship[]) => void;
}

export const SchemaEditorPane: React.FC<SchemaEditorPaneProps> = ({
  isOpen,
  children,
  tables,
  relationships,
  getNodes,
  onSchemaChange,
}) => {
  const { resolvedTheme } = useTheme();
  const [splitRatio, setSplitRatio] = useState(35);
  const [editorText, setEditorText] = useState('');
  const [errors, setErrors] = useState<ParseError[]>([]);
  const isSyncingFromCanvas = useRef(false);
  // Counts pending editor-initiated store updates so we skip the echo-back sync
  const editorInitiated = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isDragging = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Canvas -> Text: serialize when tables/relationships change
  useEffect(() => {
    // Skip the sync that echoes back our own editor-initiated update
    if (editorInitiated.current > 0) {
      editorInitiated.current -= 1;
      return;
    }
    const newText = serializeToDbml(tables, relationships);
    if (newText === editorText) return;
    isSyncingFromCanvas.current = true;
    setEditorText(newText);
    setTimeout(() => {
      isSyncingFromCanvas.current = false;
    }, 0);
    // editorText excluded intentionally to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables, relationships]);

  // Text -> Canvas: debounced parse on editor change
  const handleEditorChange = useCallback(
    (val: string) => {
      setEditorText(val);
      if (isSyncingFromCanvas.current) return;
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        const nodes = getNodes();
        const result = parseDbml(val, tables, nodes);
        setErrors(result.errors);
        if (result.errors.length === 0 && result.tables.length > 0) {
          editorInitiated.current += 1;
          onSchemaChange(result.tables, result.relationships);
        }
      }, 600);
    },
    [getNodes, tables, onSchemaChange]
  );

  // Divider drag
  const handleDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = ((ev.clientX - rect.left) / rect.width) * 100;
      setSplitRatio(Math.min(60, Math.max(20, ratio)));
    };

    const onMouseUp = () => {
      isDragging.current = false;
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  }, []);

  if (!isOpen) {
    return <>{children}</>;
  }

  return (
    <div ref={containerRef} className="flex flex-1 overflow-hidden min-h-0">
      {/* Editor pane */}
      <div
        style={{ width: `${splitRatio}%` }}
        className="flex flex-col min-h-0 border-r border-border overflow-hidden"
      >
        <DbmlEditor
          value={editorText}
          onChange={handleEditorChange}
          errors={errors}
          theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        />
      </div>

      {/* Divider */}
      <div
        className="w-1 bg-border hover:bg-primary cursor-col-resize shrink-0 transition-colors"
        onMouseDown={handleDividerMouseDown}
      />

      {/* Canvas pane */}
      <div
        style={{ flex: 1 }}
        className="flex flex-col min-h-0 overflow-hidden"
      >
        {children}
      </div>
    </div>
  );
};

export default SchemaEditorPane;
