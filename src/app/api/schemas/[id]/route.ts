import { NextRequest, NextResponse } from 'next/server';
import { getSchemaById, deleteSchema, updateSchemaMetadata, duplicateSchema, saveSchema } from '@/db/repositories/schema-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const schema = await getSchemaById(id);

    if (!schema) {
      return NextResponse.json({ error: 'Schema not found' }, { status: 404 });
    }

    return NextResponse.json(schema);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schema' }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, tables, relationships, action } = body;

    if (action === 'metadata') {
      await updateSchemaMetadata(id, { name, description });
      return NextResponse.json({ success: true });
    }

    if (tables && relationships) {
      await saveSchema({ id, name, description, tables, relationships });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update schema' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await deleteSchema(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete schema' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === 'duplicate') {
      const newId = await duplicateSchema(id);
      return NextResponse.json({ id: newId });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to duplicate schema' }, { status: 500 });
  }
}
