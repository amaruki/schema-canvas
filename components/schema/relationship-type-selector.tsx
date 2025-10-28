"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RELATIONSHIP_TYPES, RelationshipType } from './relationship-edge';

interface RelationshipTypeSelectorProps {
  sourceColumn: { name: string; table: string };
  targetColumn: { name: string; table: string };
  onSelectType: (type: RelationshipType) => void;
  onCancel: () => void;
}

export const RelationshipTypeSelector: React.FC<RelationshipTypeSelectorProps> = ({
  sourceColumn,
  targetColumn,
  onSelectType,
  onCancel,
}) => {
  const relationshipDescriptions = {
    'one-to-one': {
      title: 'One to One (1:1)',
      description: 'Each record in the source table relates to exactly one record in the target table',
      example: 'User → Profile',
      useCase: 'Perfect for extending user data, configuration settings',
    },
    'one-to-many': {
      title: 'One to Many (1:N)',
      description: 'One record in the source table can relate to many records in the target table',
      example: 'User → Orders',
      useCase: 'Most common relationship, like users with multiple posts',
    },
    'many-to-many': {
      title: 'Many to Many (N:N)',
      description: 'Many records in source table can relate to many records in target table',
      example: 'Students ↔ Courses',
      useCase: 'Requires a junction table, like product categories',
    },
    'many-to-one': {
      title: 'Many to One (N:1)',
      description: 'Many records in source table relate to one record in target table',
      example: 'Orders → Customer',
      useCase: 'Foreign key relationships, like posts belonging to categories',
    },
    'zero-to-one': {
      title: 'Zero to One (0:1)',
      description: 'Optional relationship where source may or may not have related target',
      example: 'Employee → Manager',
      useCase: 'Optional relationships, like profile pictures',
    },
    'zero-to-many': {
      title: 'Zero to Many (0:N)',
      description: 'Source may have zero or many relationships to target',
      example: 'Author → Books',
      useCase: 'Optional collections, like user comments',
    },
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm">
      <Card className="w-full max-w-2xl max-h-[80vh] overflow-y-auto bg-card/95 backdrop-blur-xl border-border shadow-2xl">
        <CardHeader>
          <CardTitle className="text-xl">Choose Relationship Type</CardTitle>
          <div className="text-sm text-muted-foreground">
            Connecting <strong>{sourceColumn.table}.{sourceColumn.name}</strong> to{' '}
            <strong>{targetColumn.table}.{targetColumn.name}</strong>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(RELATIONSHIP_TYPES).map(([type, config]) => {
            const desc = relationshipDescriptions[type as RelationshipType];
            return (
              <Button
                key={type}
                variant="outline"
                className="w-full h-auto p-4 justify-start hover:bg-accent/50 hover:border-primary transition-all"
                onClick={() => onSelectType(type as RelationshipType)}
              >
                <div className="flex items-start gap-4 text-left">
                  <Badge
                    variant="secondary"
                    className="mt-1 shrink-0"
                    style={{
                      backgroundColor: `${config.color}20`,
                      borderColor: config.color,
                      color: config.color,
                    }}
                  >
                    {config.label}
                  </Badge>
                  <div className="flex-1 space-y-2">
                    <div>
                      <h4 className="font-medium">{desc.title}</h4>
                      <p className="text-sm text-muted-foreground">{desc.description}</p>
                    </div>
                    <div className="flex gap-4 text-xs text-muted-foreground">
                      <span>
                        <strong>Example:</strong> {desc.example}
                      </span>
                      <span>
                        <strong>Use case:</strong> {desc.useCase}
                      </span>
                    </div>
                  </div>
                </div>
              </Button>
            );
          })}

          <div className="pt-4 border-t border-border">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="w-full"
            >
              Cancel
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RelationshipTypeSelector;