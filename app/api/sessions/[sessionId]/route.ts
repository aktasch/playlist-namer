import { NextRequest, NextResponse } from "next/server";
import { getMergedSession, getSessionsCollection } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const collection = await getSessionsCollection();
  const session = await getMergedSession(collection, sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session ID not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
