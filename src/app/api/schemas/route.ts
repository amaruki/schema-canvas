import { NextRequest, NextResponse } from 'next/server';
import { getAllSchemas, createSchema } from '@/db/repositories/schema-repository';

export async function GET() {
  try {
    const schemas = await getAllSchemas();
    return NextResponse.json(schemas);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch schemas' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const id = await createSchema(name, description);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create schema' }, { status: 500 });
  }
}
