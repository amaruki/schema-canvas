"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Table, Column } from "@/types/schema";
import { useSchema } from "@/hooks/use-schema";
import type { ColumnType } from "@/constants/schema";

type SchemaState = {
  updateTable: (id: string, updates: Partial<Table>) => void;
  addColumn: (tableId: string, column: Omit<Column, 'id'>) => void;
  updateColumn: (tableId: string, columnId: string, updates: Partial<Column>) => void;
  deleteColumn: (tableId: string, columnId: string) => void;
};
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Key, Link, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableNodeData extends Node {
  table: Table;
  data: {
    table: Table;
  }
}

const TYPE_GROUPS = [
  {
    label: "Numeric",
    types: ["integer", "bigint", "float", "decimal"],
  },
  {
    label: "Text",
    types: ["string", "text", "uuid"],
  },
  {
    label: "Date / Time",
    types: ["date", "datetime", "timestamp"],
  },
  {
    label: "Other",
    types: ["boolean", "json", "binary", "enum", "array"],
  },
];

const TableNode: React.FC<NodeProps<TableNodeData>> = (props) => {
  const { selected } = props;
  const data = props.data as unknown as TableNodeData;
  const table = data?.table;

  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(table?.name ?? '');
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumn, setNewColumn] = useState<{ name: string; type: ColumnType; nullable: boolean; primaryKey: boolean; unique: boolean }>({
    name: "",
    type: "string",
    nullable: true,
    primaryKey: false,
    unique: false,
  });
  const [isEditingColumn, setIsEditingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);

  const updateTable = useSchema((state: SchemaState) => state.updateTable);
  const addColumn = useSchema((state: SchemaState) => state.addColumn);
  const updateColumn = useSchema((state: SchemaState) => state.updateColumn);
  const deleteColumn = useSchema((state: SchemaState) => state.deleteColumn);

  const handleNameUpdate = () => {
    if (tempName.trim() && tempName !== table.name) {
      updateTable(table.id, { name: tempName.trim() });
    }
    setIsEditingName(false);
    setTempName(table.name);
  };

  const handleAddColumn = () => {
    if (newColumn.name.trim()) {
      addColumn(table.id, { ...newColumn, name: newColumn.name.trim() });
      setNewColumn({ name: "", type: "string", nullable: true, primaryKey: false, unique: false });
      setIsAddingColumn(false);
    }
  };

  const handleDeleteColumn = (columnId: string) => deleteColumn(table.id, columnId);

  const handleEditColumn = (column: Column) => {
    setEditingColumn({ ...column });
    setIsEditingColumn(true);
  };

  const handleSaveEditColumn = useCallback(() => {
    if (editingColumn && editingColumn.name.trim()) {
      updateColumn(table.id, editingColumn.id, {
        name: editingColumn.name.trim(),
        type: editingColumn.type,
        nullable: editingColumn.nullable,
        primaryKey: editingColumn.primaryKey,
        unique: editingColumn.unique,
        defaultValue: editingColumn.defaultValue,
        description: editingColumn.description,
      });
      setIsEditingColumn(false);
      setEditingColumn(null);
    }
  }, [editingColumn, updateColumn, table]);

  const handleCancelEditColumn = useCallback(() => {
    setIsEditingColumn(false);
    setEditingColumn(null);
  }, []);

  useEffect(() => {
    if (!isEditingColumn) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancelEditColumn();
      else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditColumn(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditingColumn, handleSaveEditColumn, handleCancelEditColumn]);

  if (!table) return null;

  return (
    <>
      <Card
        className={cn(
          "min-w-[220px] max-w-[320px] border shadow-sm overflow-visible",
          selected ? "border-primary shadow-md ring-1 ring-primary/30" : "border-border"
        )}
      >
        {/* Header */}
        <div className="bg-primary px-3 py-1.5 flex items-center gap-2 group rounded-t-[inherit]">
          <GripVertical className="h-3 w-3 text-primary-foreground/40 shrink-0 cursor-grab" />
          {isEditingName ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameUpdate();
                if (e.key === "Escape") { setIsEditingName(false); setTempName(table.name); }
              }}
              className="h-5 text-xs font-semibold bg-primary/80 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/50 flex-1"
              autoFocus
            />
          ) : (
            <div
              className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0"
              onClick={() => setIsEditingName(true)}
            >
              <span className="text-xs font-semibold text-primary-foreground truncate">
                {table.name}
              </span>
              <Edit2 className="h-2.5 w-2.5 text-primary-foreground/50 opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
          )}
          <span className="text-[9px] text-primary-foreground/50 font-mono shrink-0">
            {table.columns.length} col{table.columns.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Columns */}
        <CardContent className="p-0">
          {table.columns.map((column: Column) => (
            <div
              key={column.id}
              className={cn(
                "flex items-center py-1 px-2 text-[11px] group/row relative border-b border-border/50 last:border-b-0 hover:bg-muted/30",
                column.primaryKey && "bg-amber-50/50 dark:bg-amber-950/20",
                column.foreignKey && !column.primaryKey && "bg-blue-50/30 dark:bg-blue-950/10",
              )}
            >
              {/* Left handle - always present */}
              <Handle
                type="target"
                position={Position.Left}
                id={`${column.id}-left-target`}
                className={cn(
                  "w-2! h-2! border-[1.5px]! border-card! -left-1! z-10!",
                  column.primaryKey ? "bg-amber-500!" : column.foreignKey ? "bg-primary!" : "bg-muted-foreground/40!"
                )}
              />
              <Handle
                type="source"
                position={Position.Left}
                id={`${column.id}-left`}
                className="w-2! h-2! border-[1.5px]! border-card! -left-1! z-10! opacity-0! pointer-events-none!"
              />

              {/* Right handle - always present */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.id}-right`}
                className={cn(
                  "w-2! h-2! border-[1.5px]! border-card! -right-1! z-10!",
                  column.primaryKey ? "bg-amber-500!" : column.foreignKey ? "bg-primary!" : "bg-muted-foreground/40!"
                )}
              />
              <Handle
                type="target"
                position={Position.Right}
                id={`${column.id}-right-target`}
                className="w-2! h-2! border-[1.5px]! border-card! -right-1! z-10! opacity-0! pointer-events-none!"
              />

              <div className="flex items-center gap-1 flex-1 min-w-0 ml-1">
                {/* Badges */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {column.primaryKey && (
                    <span className="inline-flex items-center justify-center h-3.5 px-1 rounded text-[8px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 leading-none" title="Primary Key">
                      PK
                    </span>
                  )}
                  {column.foreignKey && !column.primaryKey && (
                    <span className="inline-flex items-center justify-center h-3.5 px-1 rounded text-[8px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 leading-none" title="Foreign Key">
                      FK
                    </span>
                  )}
                </div>

                <span className={cn(
                  "font-medium truncate",
                  column.primaryKey ? "text-foreground" : "text-foreground/90"
                )}>
                  {column.name}
                </span>

                {/* Constraint badges */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {!column.nullable && !column.primaryKey && (
                    <span className="inline-flex items-center justify-center h-3 px-0.5 rounded text-[7px] font-semibold text-orange-600 dark:text-orange-400 leading-none" title="NOT NULL">
                      NN
                    </span>
                  )}
                  {column.unique && !column.primaryKey && (
                    <span className="inline-flex items-center justify-center h-3 px-0.5 rounded text-[7px] font-semibold text-purple-600 dark:text-purple-400 leading-none" title="Unique">
                      UQ
                    </span>
                  )}
                </div>

                <span className="font-mono text-[9px] text-muted-foreground ml-auto shrink-0 pl-2">
                  {column.type}
                  {column.defaultValue && (
                    <span className="text-primary/60"> ={column.defaultValue}</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-0.5 ml-0.5 opacity-0 group-hover/row:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 hover:bg-accent"
                  onClick={() => handleEditColumn(column)}
                >
                  <Edit2 className="h-2 w-2 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-4 w-4 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteColumn(column.id)}
                >
                  <Trash2 className="h-2 w-2" />
                </Button>
              </div>
            </div>
          ))}

          {isAddingColumn ? (
            <div className="p-1.5 border-t border-border bg-muted/50 space-y-1.5">
              <div className="flex gap-1">
                <Input
                  placeholder="column_name"
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                  className="h-6 text-[11px] flex-1 font-mono"
                  autoFocus
                />
                <Select
                  value={newColumn.type}
                  onValueChange={(v) => setNewColumn({ ...newColumn, type: v as ColumnType })}
                >
                  <SelectTrigger className="h-6 text-[11px] w-24">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {TYPE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-[10px] text-muted-foreground font-semibold">{group.label}</SelectLabel>
                        {group.types.map((t) => (
                          <SelectItem key={t} value={t} className="text-[11px]">{t}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {[
                  { label: "NN", title: "NOT NULL", checked: !newColumn.nullable, onChange: (v: boolean) => setNewColumn({ ...newColumn, nullable: !v }) },
                  { label: "UQ", title: "Unique", checked: newColumn.unique, onChange: (v: boolean) => setNewColumn({ ...newColumn, unique: v }) },
                  { label: "PK", title: "Primary Key", checked: newColumn.primaryKey, onChange: (v: boolean) => setNewColumn({ ...newColumn, primaryKey: v }) },
                ].map(({ label, title, checked, onChange }) => (
                  <Label key={label} className="flex items-center gap-0.5 text-[10px] cursor-pointer" title={title}>
                    <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="h-3 w-3" />
                    {label}
                  </Label>
                ))}
                <div className="flex gap-1 ml-auto">
                  <Button size="sm" onClick={handleAddColumn} className="h-5 text-[10px] px-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsAddingColumn(false)} className="h-5 text-[10px] px-2">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full flex items-center gap-1 px-2 py-1 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/50 border-t border-border/50 transition-colors"
            >
              <Plus className="h-2.5 w-2.5" />
              Add column
            </button>
          )}
        </CardContent>
      </Card>

      {/* Edit Column Dialog */}
      {isEditingColumn && editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={handleCancelEditColumn} />
          <div className="relative z-10 w-full max-w-sm mx-4">
            <Card className="bg-card border border-border shadow-lg">
              <CardHeader className="pb-2 pt-3 px-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Edit Column</h3>
                  <Button variant="ghost" size="sm" onClick={handleCancelEditColumn} className="h-6 w-6 p-0 hover:bg-muted">
                    <span className="text-sm leading-none text-muted-foreground">x</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2.5 px-4 pb-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground">Column Name</Label>
                    <Input value={editingColumn.name} onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })} className="h-7 text-xs font-mono" autoFocus />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px] font-medium text-muted-foreground">Data Type</Label>
                    <Select value={editingColumn.type} onValueChange={(v) => setEditingColumn({ ...editingColumn, type: v as ColumnType })}>
                      <SelectTrigger className="h-7 text-xs w-full"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card">
                        {TYPE_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel className="text-[10px] text-muted-foreground font-semibold">{group.label}</SelectLabel>
                            {group.types.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground">Default Value</Label>
                  <Input value={editingColumn.defaultValue || ''} onChange={(e) => setEditingColumn({ ...editingColumn, defaultValue: e.target.value || undefined })} className="h-7 text-xs font-mono" placeholder="e.g. now(), 0, 'active'" />
                </div>
                <div className="flex items-center gap-4 py-1">
                  {[
                    { label: "NOT NULL", checked: !editingColumn.nullable, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, nullable: !v }) },
                    { label: "Unique", checked: editingColumn.unique, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, unique: v }) },
                    { label: "Primary Key", checked: editingColumn.primaryKey, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, primaryKey: v }) },
                  ].map(({ label, checked, onChange }) => (
                    <Label key={label} className="flex items-center gap-1 text-[11px] cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="h-3.5 w-3.5" />
                      {label}
                    </Label>
                  ))}
                </div>
                <div className="space-y-1">
                  <Label className="text-[10px] font-medium text-muted-foreground">Description</Label>
                  <textarea
                    value={editingColumn.description || ''}
                    onChange={(e) => setEditingColumn({ ...editingColumn, description: e.target.value || undefined })}
                    className="w-full text-xs p-2 border border-border rounded bg-background resize-none h-12 focus:outline-none focus:ring-1 focus:ring-primary font-mono"
                    placeholder="Column description..."
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveEditColumn} className="flex-1 h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!editingColumn.name.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEditColumn} className="flex-1 h-7 text-xs">
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </>
  );
};

export default TableNode;
