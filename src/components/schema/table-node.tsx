"use client";

import React, { useState, useEffect } from "react";
import { Handle, Position, NodeProps, type Node } from '@xyflow/react';
import { Table, Column } from "@/types/schema";
import { useSchema } from "@/hooks/use-schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Key, Link } from "lucide-react";
import { cn } from "@/lib/utils";

interface TableNodeData extends Node {
  table: any;
  data: {
    table: Table;
  }
}

const TYPE_OPTIONS = [
  "string", "text", "integer", "bigint", "float", "decimal",
  "boolean", "date", "datetime", "timestamp", "json", "uuid", "binary",
];

const TableNode: React.FC<NodeProps<TableNodeData>> = (props) => {
  const { selected } = props;
  const data = props.data as unknown as TableNodeData;
  if (!data || !data.table) return null;

  const table = data.table;
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(table.name);
  const [isAddingColumn, setIsAddingColumn] = useState(false);
  const [newColumn, setNewColumn] = useState({
    name: "",
    type: "string" as const,
    nullable: true,
    primaryKey: false,
    unique: false,
  });
  const [isEditingColumn, setIsEditingColumn] = useState(false);
  const [editingColumn, setEditingColumn] = useState<Column | null>(null);

  const updateTable = useSchema((state: any) => state.updateTable);
  const addColumn = useSchema((state: any) => state.addColumn);
  const updateColumn = useSchema((state: any) => state.updateColumn);
  const deleteColumn = useSchema((state: any) => state.deleteColumn);

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

  const handleSaveEditColumn = () => {
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
  };

  const handleCancelEditColumn = () => {
    setIsEditingColumn(false);
    setEditingColumn(null);
  };

  useEffect(() => {
    if (!isEditingColumn) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleCancelEditColumn();
      else if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSaveEditColumn(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditingColumn, editingColumn]);

  const hasHandle = (column: Column) => column.primaryKey || !!column.foreignKey;

  return (
    <>
      <Card
        className={cn(
          "min-w-[15rem] border shadow-sm overflow-hidden",
          selected ? "border-primary shadow-md" : "border-border"
        )}
      >
        {/* Header */}
        <div className="bg-primary px-3 py-2 flex items-center gap-2 group">
          {isEditingName ? (
            <Input
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              onBlur={handleNameUpdate}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleNameUpdate();
                if (e.key === "Escape") { setIsEditingName(false); setTempName(table.name); }
              }}
              className="h-6 text-sm font-semibold bg-primary/80 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/50 focus-visible:ring-primary-foreground/50 flex-1"
              autoFocus
            />
          ) : (
            <div
              className="flex items-center gap-2 flex-1 cursor-pointer min-w-0"
              onClick={() => setIsEditingName(true)}
            >
              <span className="text-sm font-semibold text-primary-foreground truncate">
                {table.name}
              </span>
              <Edit2 className="h-3 w-3 text-primary-foreground/50 opacity-0 group-hover:opacity-100 shrink-0" />
            </div>
          )}
        </div>

        {/* Columns */}
        <CardContent className="p-0">
          {table.columns.map((column: Column) => (
            <div
              key={column.id}
              className={cn(
                "flex items-center py-1.5 px-2 text-xs group/row relative border-b border-border last:border-b-0",
                column.primaryKey && "border-l-2 border-l-amber-400",
                column.foreignKey && !column.primaryKey && "border-l-2 border-l-primary",
              )}
            >
              {hasHandle(column) && (
                <>
                  <Handle
                    type="source"
                    position={Position.Left}
                    id={`${column.id}-left`}
                    className="!w-2.5 !h-2.5 !border-2 !border-card !-left-1.5 z-10"
                  />
                  <Handle
                    type="target"
                    position={Position.Left}
                    id={`${column.id}-left-target`}
                    className="!w-2.5 !h-2.5 !border-2 !border-card !-left-1.5 z-10 !opacity-0 !pointer-events-none"
                  />
                  <Handle
                    type="source"
                    position={Position.Right}
                    id={`${column.id}-right`}
                    className="!w-2.5 !h-2.5 !border-2 !border-card !-right-1.5 z-10 !opacity-0 !pointer-events-none"
                  />
                  <Handle
                    type="target"
                    position={Position.Right}
                    id={`${column.id}-right-target`}
                    className="!w-2.5 !h-2.5 !border-2 !border-card !-right-1.5 z-10"
                  />
                </>
              )}

              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                {column.primaryKey && <Key className="h-3 w-3 text-amber-500 shrink-0" />}
                {column.foreignKey && !column.primaryKey && <Link className="h-3 w-3 text-primary shrink-0" />}
                <span className="font-medium text-foreground truncate">
                  {column.name}
                  {!column.nullable && <span className="text-destructive ml-0.5">*</span>}
                </span>
                <span className="font-mono text-[10px] text-muted-foreground ml-auto shrink-0 pl-2">
                  {column.type}
                  {column.defaultValue && (
                    <span className="text-primary/70"> ={column.defaultValue}</span>
                  )}
                </span>
              </div>

              <div className="flex items-center gap-0.5 ml-1 opacity-0 group-hover/row:opacity-100">
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 hover:bg-accent"
                  onClick={() => handleEditColumn(column)}
                >
                  <Edit2 className="h-2.5 w-2.5 text-muted-foreground" />
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-5 w-5 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => handleDeleteColumn(column.id)}
                >
                  <Trash2 className="h-2.5 w-2.5" />
                </Button>
              </div>
            </div>
          ))}

          {isAddingColumn ? (
            <div className="p-2 border-t border-border bg-muted/50 space-y-2">
              <div className="flex gap-1.5">
                <Input
                  placeholder="Column name"
                  value={newColumn.name}
                  onChange={(e) => setNewColumn({ ...newColumn, name: e.target.value })}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddColumn();
                    if (e.key === 'Escape') setIsAddingColumn(false);
                  }}
                  className="h-7 text-xs flex-1"
                  autoFocus
                />
                <Select
                  value={newColumn.type}
                  onValueChange={(v) => setNewColumn({ ...newColumn, type: v as any })}
                >
                  <SelectTrigger className="h-7 text-xs w-28">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-card">
                    <SelectGroup>
                      {TYPE_OPTIONS.map((t) => (
                        <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { label: "Required", checked: !newColumn.nullable, onChange: (v: boolean) => setNewColumn({ ...newColumn, nullable: !v }) },
                  { label: "Unique", checked: newColumn.unique, onChange: (v: boolean) => setNewColumn({ ...newColumn, unique: v }) },
                  { label: "PK", checked: newColumn.primaryKey, onChange: (v: boolean) => setNewColumn({ ...newColumn, primaryKey: v }) },
                ].map(({ label, checked, onChange }) => (
                  <Label key={label} className="flex items-center gap-1 text-xs cursor-pointer">
                    <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} className="h-3 w-3" />
                    {label}
                  </Label>
                ))}
                <div className="flex gap-1 ml-auto">
                  <Button size="sm" onClick={handleAddColumn} className="h-6 text-xs px-2 bg-primary hover:bg-primary/90 text-primary-foreground">
                    Add
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setIsAddingColumn(false)} className="h-6 text-xs px-2">
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setIsAddingColumn(true)}
              className="w-full flex items-center gap-1.5 px-2 py-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-muted border-t border-border"
            >
              <Plus className="h-3 w-3" />
              Add column
            </button>
          )}
        </CardContent>
      </Card>

      {/* Edit Column Dialog */}
      {isEditingColumn && editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/20" onClick={handleCancelEditColumn} />
          <div className="relative z-10 w-full max-w-md mx-4">
            <Card className="bg-card border border-border shadow-lg">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">Edit Column</h3>
                  <Button variant="ghost" size="sm" onClick={handleCancelEditColumn} className="h-7 w-7 p-0 hover:bg-muted">
                    <span className="text-base leading-none text-muted-foreground">x</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Column Name</Label>
                  <Input value={editingColumn.name} onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })} className="h-8 text-sm" autoFocus />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Data Type</Label>
                  <Select value={editingColumn.type} onValueChange={(v) => setEditingColumn({ ...editingColumn, type: v as any })}>
                    <SelectTrigger className="h-8 text-sm w-full"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectGroup>
                        {TYPE_OPTIONS.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Default Value</Label>
                  <Input value={editingColumn.defaultValue || ''} onChange={(e) => setEditingColumn({ ...editingColumn, defaultValue: e.target.value || undefined })} className="h-8 text-sm" placeholder="Optional" />
                </div>
                <div className="flex items-center gap-4">
                  {[
                    { label: "Required", checked: !editingColumn.nullable, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, nullable: !v }) },
                    { label: "Unique", checked: editingColumn.unique, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, unique: v }) },
                    { label: "Primary Key", checked: editingColumn.primaryKey, onChange: (v: boolean) => setEditingColumn({ ...editingColumn, primaryKey: v }) },
                  ].map(({ label, checked, onChange }) => (
                    <Label key={label} className="flex items-center gap-1.5 text-xs cursor-pointer">
                      <Checkbox checked={checked} onCheckedChange={(c) => onChange(c === true)} />
                      {label}
                    </Label>
                  ))}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Description</Label>
                  <textarea
                    value={editingColumn.description || ''}
                    onChange={(e) => setEditingColumn({ ...editingColumn, description: e.target.value || undefined })}
                    className="w-full text-sm p-2 border border-border rounded bg-background resize-none h-16 focus:outline-none focus:ring-1 focus:ring-primary"
                    placeholder="Optional"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <Button size="sm" onClick={handleSaveEditColumn} className="flex-1 h-8 text-xs bg-primary hover:bg-primary/90 text-primary-foreground" disabled={!editingColumn.name.trim()}>
                    Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleCancelEditColumn} className="flex-1 h-8 text-xs">
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
