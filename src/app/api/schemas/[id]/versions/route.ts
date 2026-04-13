import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-session";
import {
  getVersions,
  createVersion,
} from "@/db/repositories/schema-repository";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireSession();
    const { id } = await params;
    const versions = await getVersions(id, session.user.id);
    return NextResponse.json(versions);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch versions" },
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
    const body = await request.json().catch(() => ({}));
    const label = body.label;

    const newVersionId = await createVersion(id, session.user.id, label);
    return NextResponse.json({ id: newVersionId, success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Server error creating version:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create version",
      },
      { status: 500 },
    );
  }
}
