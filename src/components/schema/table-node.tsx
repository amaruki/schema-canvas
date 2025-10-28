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
    onTableUpdate?: (table: Table) => void;
    onColumnUpdate?: (tableId: string, column: Column) => void;
    onColumnDelete?: (tableId: string, columnId: string) => void;
    onColumnAdd?: (tableId: string, column: Column) => void;
  }
}

const TableNode: React.FC<NodeProps<TableNodeData>> = (props) => {
  const { selected } = props;
  const data = props.data as unknown as TableNodeData;
  if (!data || !data.table) {
    console.error('TableNode data is undefined or null, or table is missing');
    return null;
  }
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
      addColumn(table.id, {
        ...newColumn,
        name: newColumn.name.trim(),
      });
      setNewColumn({
        name: "",
        type: "string",
        nullable: true,
        primaryKey: false,
        unique: false,
      });
      setIsAddingColumn(false);
    }
  };

  const handleUpdateColumn = (columnId: string, updates: Partial<Column>) => {
    updateColumn(table.id, columnId, updates);
  };

  const handleDeleteColumn = (columnId: string) => {
    deleteColumn(table.id, columnId);
  };

  const handleEditColumn = (column: Column) => {
    setEditingColumn({ ...column });
    setIsEditingColumn(true);
  };

  const handleSaveEditColumn = () => {
    if (editingColumn && editingColumn.name.trim()) {
      handleUpdateColumn(editingColumn.id, {
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

  // Handle keyboard events for the edit dialog
  useEffect(() => {
    if (!isEditingColumn) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancelEditColumn();
      } else if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSaveEditColumn();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditingColumn, editingColumn]);

  const getColumnTypeIcon = (column: Column) => {
    if (column.primaryKey) {
      return <Key className="h-3 w-3 text-warning" />;
    }
    if (column.foreignKey) {
      return <Link className="h-3 w-3 text-primary" />;
    }
    return null;
  };

  return (
    <>
      <Card
        className={cn(
          "min-w-[18rem] backdrop-blur-sm border transition-shadow shadow-sm",
          selected
            ? "border-primary shadow-md"
            : "border-border hover:border-primary/30 hover:shadow-sm"
        )}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            {isEditingName ? (
              <div className="flex items-center gap-2 flex-1">
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onBlur={handleNameUpdate}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleNameUpdate();
                    if (e.key === "Escape") {
                      setIsEditingName(false);
                      setTempName(table.name);
                    }
                  }}
                  className="text-sm font-semibold h-8"
                  autoFocus
                />
              </div>
            ) : (
              <div
                className="flex items-center gap-2 flex-1 cursor-pointer"
                onClick={() => setIsEditingName(true)}
              >
                <h3 className="text-sm font-semibold">{table.name}</h3>
                <Edit2 className="h-3 w-3 text-muted-foreground hover:text-foreground transition-colors" />
              </div>
            )}
          </div>
          {table.description && (
            <p className="text-xs text-muted-foreground">{table.description}</p>
          )}
        </CardHeader>

        <CardContent className="pt-0">
          <div className="space-y-1">
            {table.columns.map((column: Column, index: number) => (
              <div
                key={column.id}
                className={cn(
                  "flex items-center justify-between p-3 rounded-lg border text-xs group relative transition-colors duration-150",
                  index === 0 && "border-t-primary",
                  column.primaryKey && "bg-warning/10 border-warning/30 text-warning shadow-[0_0_0_2px_hsl(var(--warning)/0.2)]",
                  column.foreignKey && "bg-primary/10 border-primary/30 text-primary",
                  !column.primaryKey && !column.foreignKey && "bg-muted border-border text-muted-foreground"
                )}
              >
                {/* Left handle (source) */}
                <Handle
                  type="source"
                  position={Position.Left}
                  id={column.id}
                  className="border-2 border-card shadow-sm -left-1.5 z-10"
                />

                {/* Right handle (target) */}
                <Handle
                  type="target"
                  position={Position.Right}
                  id={column.id}
                  className="border-2 border-card shadow-sm -right-1.5 z-10"
                />

                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {getColumnTypeIcon(column)}
                    {column.primaryKey && (
                      <div className="w-2 h-2 rounded-full bg-warning ring-2 ring-warning/30"></div>
                    )}
                    {column.unique && (
                      <div className="w-2 h-2 rounded-full bg-primary"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground truncate tracking-widest">
                        {column.name}
                      </span>
                      {!column.nullable && (
                        <span className="text-destructive font-bold text-xs leading-none">
                          *
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                      <span className="rounded bg-muted">
                        {column.type}
                      </span>
                      {column.defaultValue && (
                        <span className="text-primary">
                          = {column.defaultValue}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-60 hover:opacity-100 transition-opacity duration-150">
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-accent rounded-md transition-colors"
                    onClick={() => handleEditColumn(column)}
                  >
                    <Edit2 className="h-3 w-3 text-muted-foreground" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 hover:bg-destructive/10 hover:text-destructive rounded-md transition-colors"
                    onClick={() => handleDeleteColumn(column.id)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {isAddingColumn ? (
              <div className="p-4 border-2 border-dashed border-primary rounded-lg shadow-inner bg-linear-to-br from-primary/5 to-primary/10">
                <div className="space-y-3">
                  <Input
                    placeholder="Column name"
                    value={newColumn.name}
                    onChange={(e) =>
                      setNewColumn({ ...newColumn, name: e.target.value })
                    }
                    className="text-sm font-semibold bg-card h-9"
                    autoFocus
                  />

                  <div className="flex gap-2">
                    <Select
                      value={newColumn.type}
                      onValueChange={(value) =>
                        setNewColumn({ ...newColumn, type: value as any })
                      }
                      
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Select a type data" />
                      </SelectTrigger>
                      <SelectContent className="bg-card">
                        <SelectGroup >
                          <SelectItem value="string">String</SelectItem>
                          <SelectItem value="text">Text</SelectItem>
                          <SelectItem value="integer">Integer</SelectItem>
                          <SelectItem value="bigint">Big Integer</SelectItem>
                          <SelectItem value="float">Float</SelectItem>
                          <SelectItem value="decimal">Decimal</SelectItem>
                          <SelectItem value="boolean">Boolean</SelectItem>
                          <SelectItem value="date">Date</SelectItem>
                          <SelectItem value="datetime">DateTime</SelectItem>
                          <SelectItem value="timestamp">Timestamp</SelectItem>
                          <SelectItem value="json">JSON</SelectItem>
                          <SelectItem value="uuid">UUID</SelectItem>
                          <SelectItem value="binary">Binary</SelectItem>
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    
                    <Label className="flex items-center gap-2 text-xs bg-card px-3 py-2 rounded-md border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <Checkbox
                      id="required"
                      checked={!newColumn.nullable}
                      onCheckedChange={(checked) =>
                          setNewColumn({
                            ...newColumn,
                            nullable: !checked,
                          })
                        }
                      />
                      <span className="font-medium">Required</span>
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Label className="flex items-center gap-2 text-xs bg-card px-3 py-2 rounded-md border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <Checkbox
                        checked={newColumn.unique}
                        onCheckedChange={(checked) =>
                          setNewColumn({
                            ...newColumn,
                            unique: checked === true,
                          })
                        }
                        className="rounded border-border text-secondary focus:ring-secondary"
                      />
                      <span className="font-medium">Unique</span>
                    </Label>

                    <Label className="flex items-center gap-2 text-xs bg-card px-3 py-2 rounded-md border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <Checkbox
                        checked={newColumn.primaryKey}
                        onCheckedChange={(checked) =>
                          setNewColumn({
                            ...newColumn,
                            primaryKey: checked === true,
                          })
                        }
                        className="rounded border-border text-warning focus:ring-warning"
                      />
                      <span className="font-medium">Primary Key</span>
                    </Label>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={handleAddColumn}
                      className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Column
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setIsAddingColumn(false);
                        setNewColumn({
                          name: "",
                          type: "string",
                          nullable: true,
                          primaryKey: false,
                          unique: false,
                        });
                      }}
                      className="flex-1 h-9 text-xs hover:bg-accent transition-colors"
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Button
                variant="ghost"
                onClick={() => setIsAddingColumn(true)}
                className="w-full h-10 text-xs text-muted-foreground hover:text-primary hover:bg-primary/5 border-2 border-dashed border-border hover:border-primary rounded-lg transition-colors duration-150"
              >
                <Plus className="h-4 w-4 mr-2" />
                <span className="font-medium">Add Column</span>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Edit Column Dialog */}
      {isEditingColumn && editingColumn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center animate-in fade-in duration-200">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            onClick={handleCancelEditColumn}
          />

          {/* Dialog */}
          <div className="relative z-10 w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
            <Card className="bg-card border-border shadow-2xl">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Edit Column</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelEditColumn}
                    className="h-8 w-8 p-0 hover:bg-muted rounded-full"
                  >
                    <span className="text-2xl leading-none text-muted-foreground hover:text-foreground">×</span>
                  </Button>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Column Name */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Column Name</Label>
                  <Input
                    value={editingColumn.name}
                    onChange={(e) => setEditingColumn({ ...editingColumn, name: e.target.value })}
                    className="text-sm"
                    placeholder="Enter column name"
                    autoFocus
                  />
                </div>

                {/* Column Type */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Data Type</Label>
                  <Select
                    value={editingColumn.type}
                    onValueChange={(value) => setEditingColumn({ ...editingColumn, type: value as any })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select data type" />
                    </SelectTrigger>
                    <SelectContent className="bg-card">
                      <SelectGroup>
                        <SelectItem value="string">String</SelectItem>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="integer">Integer</SelectItem>
                        <SelectItem value="bigint">Big Integer</SelectItem>
                        <SelectItem value="float">Float</SelectItem>
                        <SelectItem value="decimal">Decimal</SelectItem>
                        <SelectItem value="boolean">Boolean</SelectItem>
                        <SelectItem value="date">Date</SelectItem>
                        <SelectItem value="datetime">DateTime</SelectItem>
                        <SelectItem value="timestamp">Timestamp</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                        <SelectItem value="uuid">UUID</SelectItem>
                        <SelectItem value="binary">Binary</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </div>

                {/* Default Value */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Default Value (Optional)</Label>
                  <Input
                    value={editingColumn.defaultValue || ''}
                    onChange={(e) => setEditingColumn({ ...editingColumn, defaultValue: e.target.value || undefined })}
                    className="text-sm"
                    placeholder="Enter default value"
                  />
                </div>

                {/* Options */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Options</Label>

                  <div className="grid grid-cols-2 gap-3">
                    <Label className="flex items-center gap-2 text-xs bg-card px-3 py-2 rounded-md border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <Checkbox
                        checked={!editingColumn.nullable}
                        onCheckedChange={(checked) => setEditingColumn({ ...editingColumn, nullable: !checked })}
                      />
                      <span className="font-medium">Required</span>
                    </Label>

                    <Label className="flex items-center gap-2 text-xs bg-card px-3 py-2 rounded-md border border-border hover:border-primary/50 transition-colors cursor-pointer">
                      <Checkbox
                        checked={editingColumn.unique}
                        onCheckedChange={(checked) => setEditingColumn({ ...editingColumn, unique: checked === true })}
                      />
                      <span className="font-medium">Unique</span>
                    </Label>
                  </div>

                  <Label className="flex items-center gap-2 text-xs bg-card px-3 py-2 rounded-md border border-border hover:border-primary/50 transition-colors cursor-pointer">
                    <Checkbox
                      checked={editingColumn.primaryKey}
                      onCheckedChange={(checked) => setEditingColumn({ ...editingColumn, primaryKey: checked === true })}
                      className="rounded border-border text-warning focus:ring-warning"
                    />
                    <span className="font-medium">Primary Key</span>
                  </Label>
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Description (Optional)</Label>
                  <textarea
                    value={editingColumn.description || ''}
                    onChange={(e) => setEditingColumn({ ...editingColumn, description: e.target.value || undefined })}
                    className="w-full text-sm p-3 border border-border rounded-md bg-background resize-none h-20 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                    placeholder="Enter column description"
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    onClick={handleSaveEditColumn}
                    className="flex-1 h-9 text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-md hover:shadow-lg transition-all"
                    disabled={!editingColumn.name.trim()}
                  >
                    Save Changes
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleCancelEditColumn}
                    className="flex-1 h-9 text-xs hover:bg-accent transition-colors"
                  >
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
