'use client';

import { useEffect, useState } from 'react';
import SchemaCanvas from '@/components/schema/schema-canvas';
import { useSchema } from '@/hooks/use-schema';
import { apiGetAllSchemas, apiCreateSchema } from '@/lib/schema-api';
import { migrateFromLocalStorage, checkMigrationStatus } from '@/db/migrate-localstorage';
import { toast } from 'sonner';

function SchemaInitializer() {
  const [initialized, setInitialized] = useState(false);
  const { loadSchemaList, switchSchema, createNewSchema } = useSchema();

  useEffect(() => {
    async function init() {
      try {
        const needsMigration = !(await checkMigrationStatus());
        if (needsMigration) {
          const result = await migrateFromLocalStorage();
          if (result.migrated) {
            toast.success('Successfully migrated your saved schema!');
          }
        }

        // Load schema list
        await loadSchemaList();

        const state = useSchema.getState();

        if (state.schemaList.length > 0) {
          // Load the most recently updated schema
          await switchSchema(state.schemaList[state.schemaList.length - 1].id);
        } else {
          // Create a default schema
          await createNewSchema('My First Schema');
        }
      } catch (error) {
        console.error('Failed to initialize schema:', error);
        // Create a default schema as fallback
        try {
          await createNewSchema('My First Schema');
        } catch (e) {
          console.error('Failed to create fallback schema:', e);
        }
      } finally {
        setInitialized(true);
      }
    }

    init();
  }, [loadSchemaList, switchSchema, createNewSchema]);

  if (!initialized) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return <SchemaCanvas />;
}

export default function Home() {
  return <SchemaInitializer />;
}
