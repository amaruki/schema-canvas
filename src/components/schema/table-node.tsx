"use client";

import React, { useState, useCallback } from "react";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
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
  
  React.useEffect(() => {
    if (table?.name) {
      setTempName(table.name);
    }
  }, [table?.name]);

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



  if (!table) return null;

  return (
    <>
      <Card
        className={cn(
          "min-w-[240px] max-w-[340px] border rounded-xl shadow-lg bg-card/95 backdrop-blur-sm overflow-visible py-0 gap-0 transition-all duration-200",
          selected ? "border-primary/60 shadow-primary/10 ring-2 ring-primary/20" : "border-border/60 hover:border-border shadow-black/5 dark:shadow-black/40"
        )}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/95 to-primary px-3 py-2 flex items-center gap-2 group rounded-t-[calc(var(--radius)-2px)] border-b border-primary/20">
          <GripVertical className="h-3.5 w-3.5 text-primary-foreground/40 shrink-0 cursor-grab hover:text-primary-foreground/70 transition-colors" />
          {isEditingName ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameUpdate();
                if (e.key === "Escape") { setIsEditingName(false); setTempName(table.name); }
              }}
              className="h-6 text-sm font-semibold bg-primary-foreground/10 border-primary-foreground/20 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/50 flex-1 px-1.5"
              autoFocus
            />
          ) : (
            <div
              className="flex items-center gap-1.5 flex-1 cursor-pointer min-w-0"
              onClick={() => setIsEditingName(true)}
            >
              <span className="text-sm font-semibold tracking-tight text-primary-foreground truncate">
                {table.name}
              </span>
              <Edit2 className="h-3 w-3 text-primary-foreground/50 opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
          )}
          <div className="ml-auto flex items-center justify-center bg-primary-foreground/10 px-1.5 py-0.5 rounded-full">
            <span className="text-[10px] text-primary-foreground/85 font-medium shrink-0">
              {table.columns.length} col{table.columns.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Columns */}
        <CardContent className="p-0 flex flex-col">
          {table.columns.map((column: Column) => (
            <div
              key={column.id}
              className={cn(
                "flex items-center py-2.5 px-3 text-xs group/row relative border-b border-border/40 last:border-b-0 hover:bg-muted/40 transition-colors",
                column.primaryKey && "bg-amber-50/30 dark:bg-amber-950/20",
                column.foreignKey && !column.primaryKey && "bg-blue-50/30 dark:bg-blue-950/10",
              )}
            >
              {/* Left handle - always present */}
              <Handle
                type="source"
                position={Position.Left}
                id={`${column.id}-left`}
                className={cn(
                  "w-2! h-2! border-[1.5px]! border-background! -left-1! z-10! ring-1 ring-transparent hover:ring-primary/50 hover:scale-125 transition-all opacity-0 group-hover/row:opacity-100",
                  column.primaryKey ? "bg-amber-500!" : column.foreignKey ? "bg-blue-500!" : "bg-muted-foreground/40!"
                )}
              />

              {/* Right handle - always present */}
              <Handle
                type="source"
                position={Position.Right}
                id={`${column.id}-right`}
                className={cn(
                  "w-2! h-2! border-[1.5px]! border-background! -right-1! z-10! ring-1 ring-transparent hover:ring-primary/50 hover:scale-125 transition-all opacity-0 group-hover/row:opacity-100",
                  column.primaryKey ? "bg-amber-500!" : column.foreignKey ? "bg-blue-500!" : "bg-muted-foreground/40!"
                )}
              />

              <div className="flex items-center gap-1.5 flex-1 min-w-0 ml-1">
                {/* Badges */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {column.primaryKey && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400 leading-none shadow-sm shadow-amber-900/5" title="Primary Key">
                      PK
                    </span>
                  )}
                  {column.foreignKey && !column.primaryKey && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded-[4px] text-[9px] font-bold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400 leading-none shadow-sm shadow-blue-900/5" title="Foreign Key">
                      FK
                    </span>
                  )}
                </div>

                <span className={cn(
                  "font-medium truncate tracking-tight text-[11px]",
                  column.primaryKey ? "text-foreground font-semibold" : "text-foreground/80"
                )}>
                  {column.name}
                </span>

                {/* Constraint badges */}
                <div className="flex items-center gap-0.5 shrink-0">
                  {!column.nullable && !column.primaryKey && (
                    <span className="inline-flex items-center justify-center px-1 py-0.5 rounded-[3px] text-[8px] font-semibold text-orange-600 dark:text-orange-400 leading-none bg-orange-100 dark:bg-orange-950/30" title="NOT NULL">
                      NN
                    </span>
                  )}
                  {column.unique && !column.primaryKey && (
                    <span className="inline-flex items-center justify-center px-1 py-0.5 rounded-[3px] text-[8px] font-semibold text-purple-600 dark:text-purple-400 leading-none bg-purple-100 dark:bg-purple-950/30" title="Unique">
                      UQ
                    </span>
                  )}
                </div>

                <span className="font-mono text-[10px] text-muted-foreground/70 ml-auto shrink-0 pl-3">
                  {column.type}
                  {column.defaultValue && (
                    <span className="text-primary/50 ml-0.5 font-medium">={column.defaultValue}</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100 transition-opacity">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 hover:bg-accent hover:text-foreground text-muted-foreground/50"
                  onClick={() => handleEditColumn(column)}
                >
                  <Edit2 className="h-3 w-3" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive text-muted-foreground/50"
                  onClick={() => handleDeleteColumn(column.id)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {isAddingColumn ? (
            <div className="p-2 border-t border-border/40 bg-muted/20 space-y-2 rounded-b-[calc(var(--radius)-2px)]">
              <div className="flex gap-1.5">
                <Input
                  placeholder="column_name"
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                  className="h-7 text-xs flex-1 font-mono hover:border-border transition-colors bg-background"
                  autoFocus
                />
                <Select
                  value={newColumn.type}
                  onValueChange={(v) => setNewColumn({ ...newColumn, type: v as ColumnType })}
                >
                  <SelectTrigger className="h-7 text-xs w-28 bg-background">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    {TYPE_GROUPS.map((group) => (
                      <SelectGroup key={group.label}>
                        <SelectLabel className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">{group.label}</SelectLabel>
                        {group.types.map((t) => (
                          <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>
                        ))}
                      </SelectGroup>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2.5 flex-wrap px-1">
                {[
                  { label: "NN", title: "NOT NULL", checked: !newColumn.nullable, onChange: (v: boolean) => setNewColumn({ ...newColumn, nullable: !v }) },
                  { label: "UQ", title: "Unique", checked: newColumn.unique, onChange: (v: boolean) => setNewColumn({ ...newColumn, unique: v }) },
                  { label: "PK", title: "Primary Key", checked: newColumn.primaryKey, onChange: (v: boolean) => setNewColumn({ ...newColumn, primaryKey: v }) },
                ].map(({ label, title, checked, onChange }) => (
                  <Label key={label} className="flex items-center gap-1.5 text-[10px] font-medium cursor-pointer" title={title}>
                    <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="h-3.5 w-3.5 rounded-sm" />
                    {label}
                  </Label>
                ))}
                <div className="flex gap-1.5 ml-auto">
                  <Button size="sm" variant="outline" onClick={() => setIsAddingColumn(false)} className="h-6 text-[10px] px-2.5">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={handleAddColumn} className="h-6 text-[10px] px-3 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground">
                    Add
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full flex items-center justify-center gap-1.5 px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/40 border-t border-border/40 transition-colors rounded-b-[calc(var(--radius)-2px)] group"
            >
              <Plus className="h-3 w-3 group-hover:scale-110 transition-transform" />
              Add column
            </button>
          )}
        </CardContent>
      </Card>

      {/* Edit Column Dialog */}
      <Dialog open={isEditingColumn} onOpenChange={(open) => { if (!open) handleCancelEditColumn(); }}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden shadow-xl border-border" showCloseButton={true}>
          {editingColumn && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEditColumn(); }}>
              <DialogHeader className="px-5 py-4 border-b border-border/50 bg-muted/20">
                <DialogTitle className="text-base font-semibold">Edit Column Properties</DialogTitle>
              </DialogHeader>
              <div className="p-5 space-y-5">
                <div className="grid grid-cols-[1fr_min-content] gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Column Name</Label>
                    <Input value={editingColumn.name} onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })} className="h-8 font-mono text-sm" autoFocus />
                  </div>
                  <div className="space-y-1.5 w-[140px]">
                    <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Data Type</Label>
                    <Select value={editingColumn.type} onValueChange={(v) => setEditingColumn({ ...editingColumn, type: v as ColumnType })}>
                      <SelectTrigger className="h-8 font-mono text-sm"><SelectValue /></SelectTrigger>
                      <SelectContent className="bg-card">
                        {TYPE_GROUPS.map((group) => (
                          <SelectGroup key={group.label}>
                            <SelectLabel className="text-xs">{group.label}</SelectLabel>
                            {group.types.map((t) => <SelectItem key={t} value={t} className="font-mono text-xs">{t}</SelectItem>)}
                          </SelectGroup>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Default Value</Label>
                  <Input value={editingColumn.defaultValue || ''} onChange={(e) => setEditingColumn({ ...editingColumn, defaultValue: e.target.value || undefined })} className="h-8 font-mono text-sm" placeholder="e.g. now(), 0, 'active'" />
                </div>

                <div className="flex items-center gap-6 py-3 border-y border-border/50 px-1">
                  {[
                    { label: "NOT NULL", checked: !editingColumn.nullable, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, nullable: !v }) },
                    { label: "UNIQUE", checked: editingColumn.unique, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, unique: v }) },
                    { label: "PRIMARY KEY", checked: editingColumn.primaryKey, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, primaryKey: v }) },
                  ].map(({ label, checked, onChange }) => (
                    <Label key={label} className="flex items-center gap-1.5 text-xs font-medium cursor-pointer text-foreground">
                      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="h-4 w-4 rounded-sm" />
                      {label}
                    </Label>
                  ))}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide">Description</Label>
                  <textarea
                    value={editingColumn.description || ''}
                    onChange={(e) => setEditingColumn({ ...editingColumn, description: e.target.value || undefined })}
                    className="w-full text-sm p-3 border border-input rounded-md bg-transparent resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 transition-colors font-mono"
                    placeholder="Add a comment or description..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') e.stopPropagation();
                    }}
                  />
                </div>
              </div>
              <DialogFooter className="px-5 py-4 border-t border-border/50 bg-muted/20 sm:justify-end gap-2">
                <Button type="button" variant="outline" onClick={handleCancelEditColumn} className="h-8 text-xs font-semibold px-4">
                  Cancel
                </Button>
                <Button type="submit" className="h-8 text-xs font-semibold px-6" disabled={!editingColumn.name.trim()}>
                  Save Changes
                </Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TableNode;
