import { NextRequest, NextResponse } from 'next/server';
import { getVersions, createVersion } from '@/db/repositories/schema-repository';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const versions = await getVersions(id);
    return NextResponse.json(versions);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch versions' }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const label = body.label;

    const newVersionId = await createVersion(id, label);
    return NextResponse.json({ id: newVersionId, success: true });
  } catch (error) {
    console.error('Server error creating version:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Failed to create version' }, { status: 500 });
  }
}
