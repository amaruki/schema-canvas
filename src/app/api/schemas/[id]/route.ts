import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-session";
import {
  getSchemaById,
  deleteSchema,
  updateSchemaMetadata,
  duplicateSchema,
  saveSchema,
} from "@/db/repositories/schema-repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const schema = await getSchemaById(id, session.user.id);

    if (!schema) {
      return NextResponse.json({ error: "Schema not found" }, { status: 404 });
    }

    return NextResponse.json(schema);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch schema" },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const { name, description, tables, relationships, action } = body;

    if (action === "metadata") {
      await updateSchemaMetadata(id, session.user.id, { name, description });
      return NextResponse.json({ success: true });
    }

    if (tables && relationships) {
      await saveSchema({
        id,
        userId: session.user.id,
        name,
        description,
        tables,
        relationships,
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Server error updating schema:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update schema",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    await deleteSchema(id, session.user.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to delete schema" },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const body = await request.json();
    const { action } = body;

    if (action === "duplicate") {
      const newId = await duplicateSchema(id, session.user.id);
      return NextResponse.json({ id: newId });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to duplicate schema" },
      { status: 500 },
    );
  }
}
