import { NextRequest, NextResponse } from "next/server";
import { getSessionsCollection } from "@/lib/mongodb";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ pnr: string }> },
) {
  const { pnr } = await params;
  const collection = await getSessionsCollection();
  const session = await collection.findOne({ pnr });

  if (!session) {
    return NextResponse.json({ error: "PNR not found" }, { status: 404 });
  }

  return NextResponse.json(session);
}
