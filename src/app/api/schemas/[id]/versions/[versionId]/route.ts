import { NextRequest, NextResponse } from 'next/server';
import { getVersionById, saveSchema, createVersion, getSchemaById } from '@/db/repositories/schema-repository';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string, versionId: string }> }
) {
  try {
    const { id, versionId } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'restore') {
      const version = await getVersionById(versionId);
      if (!version) return NextResponse.json({ error: 'Version not found' }, { status: 404 });

      const parsedSnapshot = JSON.parse(version.snapshot);
      const schema = await getSchemaById(id);
      if (!schema) return NextResponse.json({ error: 'Schema not found' }, { status: 404 });

      // Save live state first before restoring according to user instructions? 
      // The user said "like git revert". A git revert takes the old state, makes it the working state, and creates a commit.
      // So first we overwrite the live state and then we create a new version of that restored state.
      await saveSchema({
        id,
        name: schema.name,
        description: schema.description,
        tables: parsedSnapshot.tables,
        relationships: parsedSnapshot.relationships,
      });

      // Create a "reverted" version
      const newVersionId = await createVersion(id, `Restored to version state`);

      return NextResponse.json({ success: true, newVersionId, tables: parsedSnapshot.tables, relationships: parsedSnapshot.relationships });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Server error restoring version:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to restore version' }, { status: 500 });
  }
}
