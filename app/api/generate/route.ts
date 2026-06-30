import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionsCollection } from "@/lib/mongodb";
import { validateTracklist } from "@/lib/validateTracklist";
import { generateUniqueSessionId } from "@/lib/generateSessionId";
import { generateSuggestions } from "@/lib/generateNames";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { sessionId, tracklist } = body as { sessionId?: string; tracklist?: string };

  if (typeof tracklist !== "string") {
    return NextResponse.json({ error: "tracklist is required" }, { status: 400 });
  }

  const validation = validateTracklist(tracklist);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const collection = await getSessionsCollection();

  let resolvedSessionId: string;
  if (sessionId) {
    const existing = await collection.findOne({ sessionId });
    if (!existing) {
      return NextResponse.json({ error: "Session ID not found" }, { status: 404 });
    }
    resolvedSessionId = sessionId;
  } else {
    resolvedSessionId = await generateUniqueSessionId(collection);
    await collection.insertOne({
      sessionId: resolvedSessionId,
      createdAt: new Date(),
      generations: [],
    });
  }

  let suggestions;
  try {
    suggestions = await generateSuggestions(validation.tracks);
  } catch {
    return NextResponse.json({ error: "Failed to generate names, please try again" }, { status: 502 });
  }

  const generation = {
    _id: new ObjectId(),
    tracklist: validation.tracks,
    suggestions: suggestions.map((s) => ({ ...s, starred: false })),
    createdAt: new Date(),
  };

  await collection.updateOne(
    { sessionId: resolvedSessionId },
    { $push: { generations: generation } },
  );

  return NextResponse.json({ sessionId: resolvedSessionId, generation });
}
