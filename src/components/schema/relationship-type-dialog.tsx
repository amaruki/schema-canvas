"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Relationship } from '@/types/schema';
import { RELATIONSHIP_TYPES, RelationshipType } from './relationship-edge';

interface RelationshipTypeDialogProps {
  isOpen: boolean;
  onClose: () => void;
  relationship: Relationship;
  onUpdateType: (newType: RelationshipType) => void;
  allTables: Array<{ id: string; name: string; columns: Array<{ id: string; name: string }> }>;
}

export const RelationshipTypeDialog: React.FC<RelationshipTypeDialogProps> = ({
  isOpen,
  onClose,
  relationship,
  onUpdateType,
  allTables,
}) => {
  // Get table and column names for display
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
  const currentTypeConfig = RELATIONSHIP_TYPES[relationship.type as RelationshipType] || RELATIONSHIP_TYPES['one-to-many'];

  const handleSelectType = (newType: RelationshipType) => {
    onUpdateType(newType);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Change Relationship Type</DialogTitle>
          <DialogDescription>
            Select a new relationship type for the connection between tables.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Current Relationship Info */}
          <div className="p-4 bg-muted/50 rounded-lg border">
            <div className="text-sm font-medium mb-2">Current Relationship:</div>
            <div className="text-sm text-muted-foreground mb-3">
              <div>
                <strong>{source.table}.{source.column}</strong> →{" "}
                <strong>{target.table}.{target.column}</strong>
              </div>
            </div>
            <div>
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

          {/* Relationship Type Options */}
          <div className="space-y-3">
            <div className="text-sm font-medium">Select New Type:</div>
            <div className="grid gap-2 max-h-64 overflow-y-auto">
              {Object.entries(RELATIONSHIP_TYPES).map(([type, config]) => {
                const isCurrentType = type === relationship.type;
                return (
                  <Button
                    key={type}
                    variant={isCurrentType ? "default" : "outline"}
                    className={`
                      h-auto p-4 justify-start text-left
                      ${isCurrentType ? '' : 'hover:border-primary/50'}
                    `}
                    style={isCurrentType ? {
                      borderColor: config.color,
                      backgroundColor: `${config.color}10`,
                    } : {}}
                    onClick={() => handleSelectType(type as RelationshipType)}
                  >
                    <div className="flex items-center gap-3 w-full">
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
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RelationshipTypeDialog;