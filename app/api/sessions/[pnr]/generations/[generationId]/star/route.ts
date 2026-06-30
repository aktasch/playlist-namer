import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionsCollection } from "@/lib/mongodb";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ pnr: string; generationId: string }> },
) {
  const { pnr, generationId } = await params;
  const body = await req.json();
  const { suggestionIndex } = body as { suggestionIndex?: number };

  if (
    typeof suggestionIndex !== "number" ||
    suggestionIndex < 0 ||
    suggestionIndex > 2
  ) {
    return NextResponse.json({ error: "suggestionIndex must be 0, 1, or 2" }, { status: 400 });
  }

  let generationObjectId: ObjectId;
  try {
    generationObjectId = new ObjectId(generationId);
  } catch {
    return NextResponse.json({ error: "Invalid generation id" }, { status: 400 });
  }

  const collection = await getSessionsCollection();
  const session = await collection.findOne({
    pnr,
    "generations._id": generationObjectId,
  });

  if (!session) {
    return NextResponse.json({ error: "Session or generation not found" }, { status: 404 });
  }

  const generation = session.generations.find((g) => g._id.equals(generationObjectId));
  const currentValue = generation!.suggestions[suggestionIndex].starred;

  await collection.updateOne(
    { pnr, "generations._id": generationObjectId },
    {
      $set: {
        [`generations.$.suggestions.${suggestionIndex}.starred`]: !currentValue,
      },
    },
  );

  return NextResponse.json({ starred: !currentValue });
}
