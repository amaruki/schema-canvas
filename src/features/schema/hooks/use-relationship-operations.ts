/**
 * Hook for relationship operations - encapsulates relationship-related state and logic
 */

import { useCallback } from 'react';
import { useSchema } from '@/hooks/use-schema';
import type { Relationship, Table, Column } from '@/features/schema/types/schema.types';
import { createRelationship, validateRelationship, getTableRelationships } from '@/features/schema/utils/schema.utils';
import { ID_GENERATORS } from '@/constants/schema';

export const useRelationshipOperations = () => {
  const {
    addRelationship,
    updateRelationship,
    deleteRelationship,
    tables,
    relationships
  } = useSchema();

  /**
   * Creates a new relationship
   */
  const createNewRelationship = useCallback((
    sourceTableId: string,
    sourceColumnId: string,
    targetTableId: string,
    targetColumnId: string,
    type: string,
    options?: {
      name?: string;
      onDelete?: string;
      onUpdate?: string;
    }
  ) => {
    const newRelationshipData = createRelationship(
      sourceTableId,
      sourceColumnId,
      targetTableId,
      targetColumnId,
      type
    );

    if (options) {
      Object.assign(newRelationshipData, options);
    }

    const validationErrors = validateRelationship(newRelationshipData, tables);
    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    addRelationship(newRelationshipData);
  }, [addRelationship, tables]);

  /**
   * Updates relationship properties
   */
  const updateRelationshipProperties = useCallback((
    relationshipId: string,
    properties: Partial<Relationship>
  ) => {
    // Validate the updated relationship
    const existingRelationship = relationships.find(r => r.id === relationshipId);
    if (!existingRelationship) return;

    const updatedRelationship = { ...existingRelationship, ...properties };
    const validationErrors = validateRelationship(updatedRelationship, tables);

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(', '));
    }

    updateRelationship(relationshipId, properties);
  }, [updateRelationship, tables, relationships]);

  /**
   * Updates relationship type
   */
  const updateRelationshipType = useCallback((
    relationshipId: string,
    type: string
  ) => {
    updateRelationshipProperties(relationshipId, { type: type as any });
  }, [updateRelationshipProperties]);

  /**
   * Updates relationship name
   */
  const updateRelationshipName = useCallback((
    relationshipId: string,
    name?: string
  ) => {
    updateRelationshipProperties(relationshipId, { name });
  }, [updateRelationshipProperties]);

  /**
   * Updates relationship delete action
   */
  const updateRelationshipDeleteAction = useCallback((
    relationshipId: string,
    onDelete?: string
  ) => {
    updateRelationshipProperties(relationshipId, {
      onDelete: onDelete as any
    });
  }, [updateRelationshipProperties]);

  /**
   * Updates relationship update action
   */
  const updateRelationshipUpdateAction = useCallback((
    relationshipId: string,
    onUpdate?: string
  ) => {
    updateRelationshipProperties(relationshipId, {
      onUpdate: onUpdate as any
    });
  }, [updateRelationshipProperties]);

  /**
   * Deletes a relationship
   */
  const deleteExistingRelationship = useCallback((relationshipId: string) => {
    deleteRelationship(relationshipId);
  }, [deleteRelationship]);

  /**
   * Finds a relationship by ID
   */
  const findRelationship = useCallback((relationshipId: string): Relationship | undefined => {
    return relationships.find(rel => rel.id === relationshipId);
  }, [relationships]);

  /**
   * Gets relationships for a specific table
   */
  const getRelationshipsForTable = useCallback((tableId: string): Relationship[] => {
    return getTableRelationships(tableId, relationships);
  }, [relationships]);

  /**
   * Gets relationships between two specific tables
   */
  const getRelationshipsBetweenTables = useCallback((
    tableId1: string,
    tableId2: string
  ): Relationship[] => {
    return relationships.filter(rel =>
      (rel.sourceTableId === tableId1 && rel.targetTableId === tableId2) ||
      (rel.sourceTableId === tableId2 && rel.targetTableId === tableId1)
    );
  }, [relationships]);

  /**
   * Checks if a relationship exists between two columns
   */
  const relationshipExistsBetweenColumns = useCallback((
    sourceTableId: string,
    sourceColumnId: string,
    targetTableId: string,
    targetColumnId: string
  ): boolean => {
    return relationships.some(rel =>
      rel.sourceTableId === sourceTableId &&
      rel.sourceColumnId === sourceColumnId &&
      rel.targetTableId === targetTableId &&
      rel.targetColumnId === targetColumnId
    );
  }, [relationships]);

  /**
   * Gets all relationships where a column is involved
   */
  const getRelationshipsForColumn = useCallback((
    tableId: string,
    columnId: string
  ): Relationship[] => {
    return relationships.filter(rel =>
      (rel.sourceTableId === tableId && rel.sourceColumnId === columnId) ||
      (rel.targetTableId === tableId && rel.targetColumnId === columnId)
    );
  }, [relationships]);

  /**
   * Validates a potential relationship
   */
  const validatePotentialRelationship = useCallback((
    sourceTableId: string,
    sourceColumnId: string,
    targetTableId: string,
    targetColumnId: string
  ): string[] => {
    const relationshipData = createRelationship(
      sourceTableId,
      sourceColumnId,
      targetTableId,
      targetColumnId,
      'one-to-many' // Default type for validation
    );

    return validateRelationship(relationshipData, tables);
  }, [tables]);

  /**
   * Gets foreign key relationships for a table
   */
  const getForeignKeyRelationships = useCallback((tableId: string): Relationship[] => {
    return relationships.filter(rel => rel.sourceTableId === tableId);
  }, [relationships]);

  /**
   * Gets referenced relationships for a table (other tables referencing this table)
   */
  const getReferencedRelationships = useCallback((tableId: string): Relationship[] => {
    return relationships.filter(rel => rel.targetTableId === tableId);
  }, [relationships]);

  return {
    // Actions
    createNewRelationship,
    updateRelationshipProperties,
    updateRelationshipType,
    updateRelationshipName,
    updateRelationshipDeleteAction,
    updateRelationshipUpdateAction,
    deleteExistingRelationship,

    // Queries
    findRelationship,
    getRelationshipsForTable,
    getRelationshipsBetweenTables,
    relationshipExistsBetweenColumns,
    getRelationshipsForColumn,
    validatePotentialRelationship,
    getForeignKeyRelationships,
    getReferencedRelationships,

    // Data
    relationships
  };
};