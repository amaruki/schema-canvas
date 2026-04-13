import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-session";
import {
  getVersionById,
  saveSchema,
  getSchemaById,
  createVersion,
} from "@/db/repositories/schema-repository";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; versionId: string }> },
) {
  try {
    const session = await requireSession();
    const { id, versionId } = await params;
    const userId = session.user.id;
    const body = await request.json();
    const { action } = body;

    if (action === "restore") {
      const version = await getVersionById(versionId, userId);
      if (!version)
        return NextResponse.json(
          { error: "Version not found" },
          { status: 404 },
        );

      const parsedSnapshot = JSON.parse(version.snapshot);
      const schema = await getSchemaById(id, userId);
      if (!schema)
        return NextResponse.json(
          { error: "Schema not found" },
          { status: 404 },
        );

      await saveSchema({
        id,
        userId,
        name: schema.name,
        description: schema.description,
        tables: parsedSnapshot.tables,
        relationships: parsedSnapshot.relationships,
      });

      const newVersionId = await createVersion(
        id,
        userId,
        `Restored to version state`,
      );

      return NextResponse.json({
        success: true,
        newVersionId,
        tables: parsedSnapshot.tables,
        relationships: parsedSnapshot.relationships,
      });
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Server error restoring version:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to restore version",
      },
      { status: 500 },
    );
  }
}
