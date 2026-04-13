import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth-session";
import {
  getAllSchemas,
  createSchema,
} from "@/db/repositories/schema-repository";

export async function GET() {
  try {
    const session = await requireSession();
    const schemas = await getAllSchemas(session.user.id);
    return NextResponse.json(schemas);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to fetch schemas" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    const body = await request.json();
    const { name, description } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = await createSchema(session.user.id, name, description);
    return NextResponse.json({ id }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: "Failed to create schema" },
      { status: 500 },
    );
  }
}
