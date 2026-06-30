"use client";

import { useState } from "react";

interface Suggestion {
  name: string;
  reasoning: string;
  starred: boolean;
}

interface Generation {
  _id: string;
  tracklist: string[];
  suggestions: Suggestion[];
  createdAt: string;
}

export default function GenerationCard({
  pnr,
  generation,
}: {
  pnr: string;
  generation: Generation;
}) {
  const [suggestions, setSuggestions] = useState(generation.suggestions);

  async function toggleStar(index: number) {
    const previous = suggestions;
    const next = suggestions.map((s, i) =>
      i === index ? { ...s, starred: !s.starred } : s,
    );
    setSuggestions(next);

    try {
      const res = await fetch(
        `/api/sessions/${pnr}/generations/${generation._id}/star`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ suggestionIndex: index }),
        },
      );
      if (!res.ok) throw new Error();
    } catch {
      setSuggestions(previous);
    }
  }

  return (
    <div className="rounded-lg border border-neutral-200 p-4">
      <p className="mb-3 text-xs text-neutral-500">
        {new Date(generation.createdAt).toLocaleString()}
      </p>
      <details className="mb-3 text-sm text-neutral-600">
        <summary className="cursor-pointer select-none">
          {generation.tracklist.length} tracks
        </summary>
        <ul className="mt-2 list-disc pl-5">
          {generation.tracklist.map((track, i) => (
            <li key={i}>{track}</li>
          ))}
        </ul>
      </details>
      <div className="space-y-2">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="flex items-start justify-between gap-3 rounded-md bg-neutral-50 p-3"
          >
            <div>
              <p className="font-medium">{s.name}</p>
              <p className="text-sm text-neutral-600">{s.reasoning}</p>
            </div>
            <button
              onClick={() => toggleStar(i)}
              aria-label={s.starred ? "Unstar" : "Star"}
              className="shrink-0 text-xl"
            >
              {s.starred ? "★" : "☆"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
