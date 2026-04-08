'use client';

import { useEffect, useState } from 'react';
import { useSchema } from '@/hooks/use-schema';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { ChevronsUpDown, Plus, Copy, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export function SchemaSelector() {
  const {
    activeSchemaId,
    activeSchemaName,
    schemaList,
    isLoading,
    loadSchemaList,
    switchSchema,
    createNewSchema,
    deleteActiveSchema,
    duplicateActiveSchema,
    renameActiveSchema,
  } = useSchema();

  const [open, setOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newSchemaName, setNewSchemaName] = useState('');
  const [renameValue, setRenameValue] = useState('');

  useEffect(() => {
    loadSchemaList();
  }, [loadSchemaList]);

  const handleCreateSchema = async () => {
    if (!newSchemaName.trim()) {
      toast.error('Schema name is required');
      return;
    }

    try {
      await createNewSchema(newSchemaName.trim());
      setNewSchemaName('');
      setCreateDialogOpen(false);
      toast.success('Schema created');
    } catch (error) {
      toast.error('Failed to create schema');
    }
  };

  const handleSwitchSchema = async (id: string) => {
    try {
      await switchSchema(id);
      setOpen(false);
    } catch (error) {
      toast.error('Failed to switch schema');
    }
  };

  const handleDeleteSchema = async () => {
    try {
      await deleteActiveSchema();
      setDeleteDialogOpen(false);
      toast.success('Schema deleted');
    } catch (error) {
      toast.error('Failed to delete schema');
    }
  };

  const handleDuplicateSchema = async () => {
    try {
      await duplicateActiveSchema();
      toast.success('Schema duplicated');
    } catch (error) {
      toast.error('Failed to duplicate schema');
    }
  };

  const handleStartRename = () => {
    setOpen(false);
    setRenameValue(activeSchemaName);
    setRenameDialogOpen(true);
  };

  const handleCancelRename = () => {
    setRenameDialogOpen(false);
    setRenameValue('');
  };

  const handleSaveRename = async () => {
    if (!renameValue.trim()) {
      toast.error('Schema name cannot be empty');
      return;
    }

    try {
      await renameActiveSchema(renameValue.trim());
      setRenameDialogOpen(false);
      setRenameValue('');
      toast.success('Schema renamed');
    } catch (error) {
      toast.error('Failed to rename schema');
    }
  };

  const handleRenameKeyDown = async (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      await handleSaveRename();
    } else if (e.key === 'Escape') {
      handleCancelRename();
    }
  };

  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="min-w-[200px]" disabled={isLoading}>
            <span className="truncate">{activeSchemaName}</span>
            <ChevronsUpDown className="h-4 w-4 shrink-0 opacity-50 ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[280px]">
          {schemaList.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No schemas yet. Create one!
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto">
              {schemaList.map((schema) => (
                <DropdownMenuItem
                  key={schema.id}
                  onClick={() => handleSwitchSchema(schema.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="font-medium truncate">
                      {schema.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {schema.tableCount} tables, {schema.relationshipCount} relationships - {formatRelativeTime(schema.updatedAt)}
                    </span>
                  </div>
                  {schema.id === activeSchemaId && (
                    <span className="text-xs text-primary font-medium ml-2 shrink-0">Active</span>
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => setCreateDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            New Schema
          </DropdownMenuItem>
          {activeSchemaId && (
            <>
              <DropdownMenuItem onClick={handleDuplicateSchema}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicate Schema
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Current Schema
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Create Schema Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Schema</DialogTitle>
            <DialogDescription>
              Enter a name for your new schema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="schema-name">Schema Name</Label>
              <Input
                id="schema-name"
                value={newSchemaName}
                onChange={(e) => setNewSchemaName(e.target.value)}
                placeholder="e.g. E-commerce Database"
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSchema()}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSchema} disabled={!newSchemaName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Schema Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Schema</DialogTitle>
            <DialogDescription>
              Enter a new name for this schema.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rename-schema-name">Schema Name</Label>
              <Input
                id="rename-schema-name"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                placeholder="e.g. E-commerce Database"
                onKeyDown={handleRenameKeyDown}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelRename}>
              Cancel
            </Button>
            <Button onClick={handleSaveRename} disabled={!renameValue.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Schema</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{activeSchemaName}&quot;? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchema} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
