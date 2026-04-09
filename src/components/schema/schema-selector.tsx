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
import { ChevronsUpDown, Plus, Copy, Trash2, Pencil, Database, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
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
          <Button variant="ghost" className="min-w-[180px] max-w-[240px] px-2 h-8 font-semibold text-sm justify-between shadow-none hover:bg-muted/50" disabled={isLoading}>
            <div className="flex items-center truncate">
              <Database className="h-3.5 w-3.5 mr-2 text-muted-foreground shrink-0" />
              <span className="truncate">{activeSchemaName}</span>
            </div>
            <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50 ml-2" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[300px] p-2">
          <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider px-2 pb-2 pt-1 mb-1 border-b border-border/50">
            Workspace Schemas
          </div>
          {schemaList.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              No schemas yet. Create one!
            </div>
          ) : (
            <div className="max-h-[300px] overflow-y-auto scrollbar-thin py-1 pr-1">
              {schemaList.map((schema) => (
                <DropdownMenuItem
                  key={schema.id}
                  onClick={() => handleSwitchSchema(schema.id)}
                  className="flex items-center justify-between p-2.5 rounded-lg cursor-pointer mb-1 transition-colors hover:bg-muted/50 group"
                >
                  <div className="flex items-start min-w-0 flex-1">
                    <Database className={cn("h-4 w-4 mr-3 shrink-0 mt-0.5 transition-colors", schema.id === activeSchemaId ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className={cn("font-semibold truncate text-[13px]", schema.id === activeSchemaId ? "text-primary" : "text-foreground")}>
                        {schema.name}
                      </span>
                      <span className="text-[11px] text-muted-foreground mt-0.5">
                        {schema.tableCount} tables • {formatRelativeTime(schema.updatedAt)}
                      </span>
                    </div>
                  </div>
                  {schema.id === activeSchemaId && (
                    <Check className="h-4 w-4 text-primary shrink-0 ml-2" />
                  )}
                </DropdownMenuItem>
              ))}
            </div>
          )}
          <DropdownMenuSeparator className="my-1 border-border/50" />
          <DropdownMenuItem onClick={() => setCreateDialogOpen(true)} className="py-2 text-xs cursor-pointer group">
            <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center mr-2 group-hover:bg-primary/20 transition-colors">
              <Plus className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-medium">New Schema</span>
          </DropdownMenuItem>
          {activeSchemaId && (
            <>
              <DropdownMenuItem onClick={handleStartRename} className="py-2 text-xs cursor-pointer group">
                <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center mr-2 group-hover:bg-muted-foreground/20 transition-colors">
                  <Pencil className="h-3.5 w-3.5 text-foreground" />
                </div>
                <span className="font-medium">Rename Schema</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDuplicateSchema} className="py-2 text-xs cursor-pointer group">
                <div className="h-6 w-6 rounded-md bg-muted flex items-center justify-center mr-2 group-hover:bg-muted-foreground/20 transition-colors">
                  <Copy className="h-3.5 w-3.5 text-foreground" />
                </div>
                <span className="font-medium">Duplicate Schema</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 border-border/50" />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="py-2 text-xs text-destructive focus:text-destructive cursor-pointer group"
              >
                <div className="h-6 w-6 rounded-md bg-destructive/10 flex items-center justify-center mr-2 group-hover:bg-destructive/20 transition-colors">
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </div>
                <span className="font-medium">Delete Current Schema</span>
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
