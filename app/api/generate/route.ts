import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { appendGeneration, createSession, getSessionsCollection } from "@/lib/mongodb";
import { validateTracklist } from "@/lib/validateTracklist";
import { generateUniqueSessionId } from "@/lib/generateSessionId";
import { generateSuggestions } from "@/lib/generateNames";

export const maxDuration = 30;

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
    await createSession(collection, resolvedSessionId);
  }

  let suggestions;
  const t0 = Date.now();
  try {
    suggestions = await generateSuggestions(validation.tracks);
  } catch (err) {
    console.error("generateSuggestions failed:", err);
    return NextResponse.json({ error: "Failed to generate names, please try again" }, { status: 502 });
  }

  const generation = {
    _id: new ObjectId(),
    tracklist: validation.tracks,
    suggestions: suggestions.map((s) => ({ ...s, starred: false })),
    createdAt: new Date(),
    trackCount: validation.tracks.length,
    generationMs: Date.now() - t0,
    userAgent: req.headers.get("user-agent"),
    country: req.headers.get("x-vercel-ip-country"),
    city: req.headers.get("x-vercel-ip-city"),
    referer: req.headers.get("referer"),
  };

  await appendGeneration(collection, resolvedSessionId, generation);

  return NextResponse.json({ sessionId: resolvedSessionId, generation });
}
