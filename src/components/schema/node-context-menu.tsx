"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Copy,
  Trash2,
  Edit3,
  Link2,
  Download,
  Settings,
  Table,
} from 'lucide-react';
import { Table as TableType, Relationship } from '@/types/schema';

interface NodeContextMenuProps {
  x: number;
  y: number;
  nodeId: string;
  table: TableType;
  onClose: () => void;
  onDeleteTable: (tableId: string) => void;
  onDuplicateTable: (table: TableType) => void;
  onEditTable: (tableId: string) => void;
  onToggleConnections: (tableId: string) => void;
  onExportTable: (table: TableType) => void;
  connections: Relationship[];
  isVisible: boolean;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
  x,
  y,
  nodeId,
  table,
  onClose,
  onDeleteTable,
  onDuplicateTable,
  onEditTable,
  onToggleConnections,
  onExportTable,
  connections,
  isVisible,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isVisible, onClose]);

  // Close menu on Escape key
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isVisible) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
    console.log("Deleted table with ID:", nodeId);
    onClose();
  };

  const confirmDelete = () => {
    onDeleteTable(nodeId);
    setIsDeleteDialogOpen(false);
  };

  const handleDuplicate = () => {
    onDuplicateTable(table);
    onClose();
  };

  const handleEdit = () => {
    onEditTable(nodeId);
    onClose();
  };

  const handleExport = () => {
    onExportTable(table);
    onClose();
  };

  const handleToggleConnections = () => {
    onToggleConnections(nodeId);
    onClose();
  };

  if (!isVisible) return null;

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 220);
  const adjustedY = Math.min(y, window.innerHeight - 300);

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 min-w-[200px]"
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }}
      >
        <Card className="bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
          <div className="p-2">
            {/* Table Info */}
            <div className="px-3 py-2 border-b border-border mb-2">
              <div className="flex items-center gap-2">
                <Table className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">{table.name}</span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {table.columns.length} columns • {connections.length} connections
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-accent"
                onClick={handleEdit}
              >
                <Edit3 className="h-3 w-3 mr-2" />
                Edit Table
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-accent"
                onClick={handleDuplicate}
              >
                <Copy className="h-3 w-3 mr-2" />
                Duplicate Table
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-accent"
                onClick={handleToggleConnections}
              >
                <Link2 className="h-3 w-3 mr-2" />
                Manage Connections
                <span className="ml-auto text-muted-foreground">
                  {connections.length}
                </span>
              </Button>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-accent"
                onClick={handleExport}
              >
                <Download className="h-3 w-3 mr-2" />
                Export Table
              </Button>

              <div className="border-t border-border my-1"></div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete Table
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Table</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the table "{table.name}"? This action cannot be undone.
              {connections.length > 0 && (
                <span className="block mt-2 text-destructive">
                  This will also remove {connections.length} relationship{connections.length > 1 ? 's' : ''}.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Table
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default NodeContextMenu;