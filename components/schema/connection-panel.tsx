"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  Link2,
  Link2Off,
  Eye,
  EyeOff,
  ArrowRightLeft,
  Trash2,
  Edit,
} from 'lucide-react';
import { Table as TableType, Relationship, Column } from '@/types/schema';

interface ConnectionPanelProps {
  table: TableType;
  relationships: Relationship[];
  allTables: TableType[];
  onHighlightConnection: (relationshipId: string) => void;
  onDeleteRelationship: (relationshipId: string) => void;
  onClose: () => void;
}

export const ConnectionPanel: React.FC<ConnectionPanelProps> = ({
  table,
  relationships,
  allTables,
  onHighlightConnection,
  onDeleteRelationship,
  onClose,
}) => {
  const [highlightedRelId, setHighlightedRelId] = useState<string | null>(null);

  const incomingConnections = relationships.filter(rel => rel.targetTableId === table.id);
  const outgoingConnections = relationships.filter(rel => rel.sourceTableId === table.id);

  const getTableName = (tableId: string): string => {
    const foundTable = allTables.find(t => t.id === tableId);
    return foundTable?.name || 'Unknown Table';
  };

  const getColumnName = (tableId: string, columnId: string): string => {
    const foundTable = allTables.find(t => t.id === tableId);
    const foundColumn = foundTable?.columns.find(c => c.id === columnId);
    return foundColumn?.name || 'Unknown Column';
  };

  const handleHighlight = (relId: string) => {
    setHighlightedRelId(relId);
    onHighlightConnection(relId);
    setTimeout(() => setHighlightedRelId(null), 2000);
  };

  const ConnectionItem: React.FC<{
    relationship: Relationship;
    isIncoming: boolean;
  }> = ({ relationship, isIncoming }) => {
    const sourceTable = getTableName(relationship.sourceTableId);
    const targetTable = getTableName(relationship.targetTableId);
    const sourceColumn = getColumnName(relationship.sourceTableId, relationship.sourceColumnId);
    const targetColumn = getColumnName(relationship.targetTableId, relationship.targetColumnId);

    return (
      <div
        className={`
          p-3 border rounded-lg transition-all duration-200
          ${highlightedRelId === relationship.id
            ? 'border-primary bg-primary/5 shadow-md'
            : 'border-border bg-card hover:border-primary/50 hover:bg-accent/50'
          }
        `}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Badge variant={isIncoming ? "secondary" : "default"} className="text-xs">
              {isIncoming ? "Incoming" : "Outgoing"}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {relationship.type}
            </Badge>
          </div>
          <div className="flex items-center gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={() => handleHighlight(relationship.id)}
            >
              <Eye className="h-3 w-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 hover:bg-destructive/10 hover:text-destructive"
              onClick={() => onDeleteRelationship(relationship.id)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <div className="flex-1">
            <div className="font-medium text-foreground">{sourceTable}</div>
            <div className="text-muted-foreground">{sourceColumn}</div>
          </div>
          <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
          <div className="flex-1 text-right">
            <div className="font-medium text-foreground">{targetTable}</div>
            <div className="text-muted-foreground">{targetColumn}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="w-80 h-96 bg-card/95 backdrop-blur-xl border-border shadow-2xl">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="h-4 w-4 text-primary" />
            <h3 className="font-semibold">{table.name} Connections</h3>
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-6 w-6"
            onClick={onClose}
          >
            <span className="text-lg leading-none">×</span>
          </Button>
        </div>
        <div className="text-xs text-muted-foreground">
          {relationships.length} relationship{relationships.length !== 1 ? 's' : ''}
        </div>
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-64">
          {relationships.length === 0 ? (
            <div className="text-center py-8">
              <Link2Off className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No connections found</p>
              <p className="text-xs text-muted-foreground mt-1">
                Connect columns from other tables to create relationships
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {outgoingConnections.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Outgoing Connections ({outgoingConnections.length})
                  </h4>
                  <div className="space-y-2">
                    {outgoingConnections.map(rel => (
                      <ConnectionItem
                        key={rel.id}
                        relationship={rel}
                        isIncoming={false}
                      />
                    ))}
                  </div>
                </div>
              )}

              {incomingConnections.length > 0 && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Incoming Connections ({incomingConnections.length})
                  </h4>
                  <div className="space-y-2">
                    {incomingConnections.map(rel => (
                      <ConnectionItem
                        key={rel.id}
                        relationship={rel}
                        isIncoming={true}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>

        {relationships.length > 0 && (
          <div className="mt-4 pt-3 border-t border-border">
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => {
                relationships.forEach(rel => handleHighlight(rel.id));
              }}
            >
              <Eye className="h-3 w-3 mr-2" />
              Highlight All Connections
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ConnectionPanel;