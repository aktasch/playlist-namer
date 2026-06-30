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
    <div className="rounded-lg border border-[#E8EDEB] bg-white p-4 shadow-sm">
      <p className="mb-3 text-xs text-[#5C6C75]">
        {new Date(generation.createdAt).toLocaleString()}
      </p>
      <details className="mb-3 text-sm text-[#5C6C75]">
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
            className="flex items-start justify-between gap-3 rounded-md bg-[#F9FBFA] p-3"
          >
            <div>
              <p className="font-medium text-[#001E2B]">{s.name}</p>
              <p className="text-sm text-[#5C6C75]">{s.reasoning}</p>
            </div>
            <button
              onClick={() => toggleStar(i)}
              aria-label={s.starred ? "Unstar" : "Star"}
              className="shrink-0 text-xl text-[#00684A]"
            >
              {s.starred ? "★" : "☆"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
