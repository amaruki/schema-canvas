import { saveSchema, getAllSchemas } from '@/db/repositories/schema-repository';

const LOCAL_STORAGE_KEY = 'schema-canvas-storage';
const MIGRATION_FLAG = 'schema-canvas-migrated';

export interface MigrationResult {
  migrated: boolean;
  schemaId?: string;
  error?: string;
}

export async function migrateFromLocalStorage(): Promise<MigrationResult> {
  // Check if already migrated
  if (typeof window !== 'undefined' && localStorage.getItem(MIGRATION_FLAG)) {
    return { migrated: false };
  }

  try {
    // Check if there's existing data in localStorage
    const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!stored) {
      // No data to migrate
      if (typeof window !== 'undefined') {
        localStorage.setItem(MIGRATION_FLAG, 'true');
      }
      return { migrated: false };
    }

    const data = JSON.parse(stored);

    if (!data.tables || data.tables.length === 0) {
      // Empty schema, no need to migrate
      if (typeof window !== 'undefined') {
        localStorage.setItem(MIGRATION_FLAG, 'true');
      }
      return { migrated: false };
    }

    // Create new schema from localStorage data
    const schemaId = `schema_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await saveSchema({
      id: schemaId,
      name: 'My First Schema',
      tables: data.tables || [],
      relationships: data.relationships || [],
    });

    // Mark as migrated
    if (typeof window !== 'undefined') {
      localStorage.setItem(MIGRATION_FLAG, 'true');
    }

    return { migrated: true, schemaId };
  } catch (error) {
    console.error('Failed to migrate from localStorage:', error);
    return {
      migrated: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export async function checkMigrationStatus(): Promise<boolean> {
  if (typeof window === 'undefined') return true;

  const migrated = localStorage.getItem(MIGRATION_FLAG);
  if (migrated) return true;

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  return !stored;
}

export function clearMigrationFlag(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(MIGRATION_FLAG);
  }
}
