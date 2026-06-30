import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getSessionsCollection } from "@/lib/mongodb";
import { validateTracklist } from "@/lib/validateTracklist";
import { generateUniquePnr } from "@/lib/generatePnr";
import { generateSuggestions } from "@/lib/generateNames";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { pnr, tracklist } = body as { pnr?: string; tracklist?: string };

  if (typeof tracklist !== "string") {
    return NextResponse.json({ error: "tracklist is required" }, { status: 400 });
  }

  const validation = validateTracklist(tracklist);
  if (!validation.valid) {
    return NextResponse.json({ error: validation.error }, { status: 400 });
  }

  const collection = await getSessionsCollection();

  let resolvedPnr: string;
  if (pnr) {
    const existing = await collection.findOne({ pnr });
    if (!existing) {
      return NextResponse.json({ error: "PNR not found" }, { status: 404 });
    }
    resolvedPnr = pnr;
  } else {
    resolvedPnr = await generateUniquePnr(collection);
    await collection.insertOne({ pnr: resolvedPnr, createdAt: new Date(), generations: [] });
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

  await collection.updateOne({ pnr: resolvedPnr }, { $push: { generations: generation } });

  return NextResponse.json({ pnr: resolvedPnr, generation });
}
