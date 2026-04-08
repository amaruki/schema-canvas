import type { Table, Relationship, Schema } from '@/features/schema/types/schema.types';

export interface SchemaSummary {
  id: string;
  name: string;
  description: string | null;
  tableCount: number;
  relationshipCount: number;
  updatedAt: string;
}

export async function apiGetAllSchemas(): Promise<SchemaSummary[]> {
  const res = await fetch('/api/schemas');
  if (!res.ok) throw new Error('Failed to fetch schemas');
  return res.json();
}

export async function apiGetSchemaById(id: string): Promise<Schema> {
  const res = await fetch(`/api/schemas/${id}`);
  if (!res.ok) throw new Error('Failed to fetch schema');
  const data = await res.json();

  // Convert date strings to Date objects
  data.createdAt = new Date(data.createdAt);
  data.updatedAt = new Date(data.updatedAt);

  // Ensure table positions are properly structured
  data.tables = data.tables.map((table: any) => ({
    ...table,
    position: { x: table.positionX || 0, y: table.positionY || 0 },
  }));

  return data;
}

export async function apiCreateSchema(name: string, description?: string): Promise<string> {
  const res = await fetch('/api/schemas', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, description }),
  });
  if (!res.ok) throw new Error('Failed to create schema');
  const data = await res.json();
  return data.id;
}

export async function apiSaveSchema(schema: {
  id: string;
  name: string;
  description?: string;
  tables: Table[];
  relationships: Relationship[];
}): Promise<void> {
  const res = await fetch(`/api/schemas/${schema.id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...schema,
      tables: schema.tables.map((t) => ({
        ...t,
        positionX: t.position.x,
        positionY: t.position.y,
      })),
    }),
  });
  if (!res.ok) throw new Error('Failed to save schema');
}

export async function apiUpdateSchemaMetadata(
  id: string,
  updates: { name?: string; description?: string }
): Promise<void> {
  const res = await fetch(`/api/schemas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'metadata', ...updates }),
  });
  if (!res.ok) throw new Error('Failed to update schema metadata');
}

export async function apiDeleteSchema(id: string): Promise<void> {
  const res = await fetch(`/api/schemas/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete schema');
}

export async function apiDuplicateSchema(id: string): Promise<string> {
  const res = await fetch(`/api/schemas/${id}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'duplicate' }),
  });
  if (!res.ok) throw new Error('Failed to duplicate schema');
  const data = await res.json();
  return data.id;
}
