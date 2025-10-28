"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Edit,
  Trash2,
  Link2,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';
import { Relationship } from '@/types/schema';
import { RELATIONSHIP_TYPES, RelationshipType } from './relationship-edge';

interface EdgeContextMenuProps {
  x: number;
  y: number;
  edgeId: string;
  relationship: Relationship;
  onClose: () => void;
  onUpdateRelationship: (edgeId: string, updates: Partial<Relationship>) => void;
  onDeleteRelationship: (edgeId: string) => void;
  allTables: Array<{ id: string; name: string; columns: Array<{ id: string; name: string }> }>;
  isVisible: boolean;
}

export const EdgeContextMenu: React.FC<EdgeContextMenuProps> = ({
  x,
  y,
  edgeId,
  relationship,
  onClose,
  onUpdateRelationship,
  onDeleteRelationship,
  allTables,
  isVisible,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);

  // Get table and column names
  const getSourceInfo = () => {
    const sourceTable = allTables.find(t => t.id === relationship.sourceTableId);
    const sourceColumn = sourceTable?.columns.find(c => c.id === relationship.sourceColumnId);
    return {
      table: sourceTable?.name || 'Unknown Table',
      column: sourceColumn?.name || 'Unknown Column',
    };
  };

  const getTargetInfo = () => {
    const targetTable = allTables.find(t => t.id === relationship.targetTableId);
    const targetColumn = targetTable?.columns.find(c => c.id === relationship.targetColumnId);
    return {
      table: targetTable?.name || 'Unknown Table',
      column: targetColumn?.name || 'Unknown Column',
    };
  };

  const source = getSourceInfo();
  const target = getTargetInfo();

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
        if (isTypeSelectorOpen) {
          setIsTypeSelectorOpen(false);
        }
      }
    };

    if (isVisible || isTypeSelectorOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose, isTypeSelectorOpen]);

  const handleDelete = () => {
    setIsDeleteDialogOpen(true);
    onClose();
  };

  const confirmDelete = () => {
    onDeleteRelationship(edgeId);
    setIsDeleteDialogOpen(false);
  };

  const handleChangeType = () => {
    setIsTypeSelectorOpen(true);
    onClose();
  };

  const handleSelectType = (newType: RelationshipType) => {
    onUpdateRelationship(edgeId, { type: newType });
    setIsTypeSelectorOpen(false);
  };

  const currentTypeConfig = RELATIONSHIP_TYPES[relationship.type as RelationshipType] || RELATIONSHIP_TYPES['one-to-many'];

  // Adjust position if menu would go off screen
  const adjustedX = Math.min(x, window.innerWidth - 250);
  const adjustedY = Math.min(y, window.innerHeight - 400);

  if (!isVisible) return null;

  return (
    <>
      <div
        ref={menuRef}
        className="fixed z-50 min-w-60"
        style={{
          left: `${adjustedX}px`,
          top: `${adjustedY}px`,
        }}
      >
        <Card className="bg-card/95 backdrop-blur-xl border border-border shadow-2xl overflow-hidden">
          <div className="p-2">
            {/* Relationship Info */}
            <div className="px-3 py-2 border-b border-border mb-2">
              <div className="flex items-center gap-2 mb-1">
                <Link2 className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Relationship</span>
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>{source.table}.{source.column}</div>
                <div className="flex items-center gap-1">
                  <ArrowRightLeft className="h-3 w-3" />
                  <span>{target.table}.{target.column}</span>
                </div>
              </div>
              <div className="mt-2">
                <Badge
                  variant="secondary"
                  className="text-xs"
                  style={{
                    backgroundColor: `${currentTypeConfig.color}20`,
                    borderColor: currentTypeConfig.color,
                    color: currentTypeConfig.color,
                  }}
                >
                  {currentTypeConfig.label}
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-accent"
                onClick={handleChangeType}
              >
                <Edit className="h-3 w-3 mr-2" />
                Change Type
              </Button>

              <div className="border-t border-border my-1"></div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-8 px-3 text-xs hover:bg-destructive/10 hover:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="h-3 w-3 mr-2" />
                Delete Relationship
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-destructive">Delete Relationship</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the relationship between{" "}
              <strong>{source.table}.{source.column}</strong> and{" "}
              <strong>{target.table}.{target.column}</strong>?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Relationship
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Relationship Type Selector Dialog */}
      {isTypeSelectorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md max-h-[85vh] overflow-hidden bg-card rounded-lg shadow-2xl border border-border m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Change Relationship Type</h3>
                <button
                  onClick={() => setIsTypeSelectorOpen(false)}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span className="text-2xl leading-none">×</span>
                </button>
              </div>

              <div className="text-sm text-muted-foreground mb-6 p-3 bg-muted/50 rounded-lg">
                <div className="font-medium mb-1">Current Relationship:</div>
                <div>
                  <strong>{source.table}.{source.column}</strong> →{" "}
                  <strong>{target.table}.{target.column}</strong>
                </div>
                <div className="mt-2">
                  <Badge
                    variant="secondary"
                    className="text-xs"
                    style={{
                      backgroundColor: `${currentTypeConfig.color}20`,
                      borderColor: currentTypeConfig.color,
                      color: currentTypeConfig.color,
                    }}
                  >
                    {currentTypeConfig.label}
                  </Badge>
                </div>
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                <div className="text-sm font-medium text-muted-foreground mb-3">Select New Type:</div>
                {Object.entries(RELATIONSHIP_TYPES).map(([type, config]) => {
                  const isCurrentType = type === relationship.type;
                  return (
                    <button
                      key={type}
                      onClick={() => handleSelectType(type as RelationshipType)}
                      className={`
                        w-full h-auto p-4 rounded-lg border-2 transition-all duration-200
                        flex items-center gap-3 text-left
                        ${isCurrentType
                          ? 'border-primary bg-primary/10 shadow-md'
                          : 'border-border hover:border-primary/50 hover:bg-accent/50'
                        }
                      `}
                      style={isCurrentType ? {
                        borderColor: config.color,
                        backgroundColor: `${config.color}10`,
                      } : {}}
                    >
                      <Badge
                        variant="secondary"
                        className="shrink-0 text-xs font-bold"
                        style={{
                          backgroundColor: isCurrentType ? config.color : `${config.color}20`,
                          borderColor: config.color,
                          color: isCurrentType ? 'white' : config.color,
                        }}
                      >
                        {config.label}
                      </Badge>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm">
                          {type.split('-').map(word =>
                            word.charAt(0).toUpperCase() + word.slice(1)
                          ).join(' to ')}
                        </div>
                        {isCurrentType && (
                          <div className="text-xs text-primary font-medium mt-1">
                            ✓ Currently selected
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-border mt-6">
                <Button
                  variant="outline"
                  onClick={() => setIsTypeSelectorOpen(false)}
                  className="w-full"
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default EdgeContextMenu;