"use client";

import { useEffect, useState } from "react";
import GenerationCard from "@/components/GenerationCard";

const STORAGE_KEY = "playlistNamerPnr";

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

interface Session {
  pnr: string;
  generations: Generation[];
}

export default function Home() {
  const [pnr, setPnr] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [tracklist, setTracklist] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      loadSession(stored, { silent: true });
    }
  }, []);

  async function loadSession(targetPnr: string, opts: { silent?: boolean } = {}) {
    try {
      const res = await fetch(`/api/sessions/${targetPnr}`);
      if (!res.ok) {
        if (res.status === 404) {
          if (opts.silent) {
            localStorage.removeItem(STORAGE_KEY);
          } else {
            setError("PNR not found");
          }
        }
        return;
      }
      const session: Session = await res.json();
      setPnr(session.pnr);
      setGenerations(session.generations);
      localStorage.setItem(STORAGE_KEY, session.pnr);
      setError(null);
    } catch {
      if (!opts.silent) setError("Failed to load session");
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pnr: pnr ?? undefined, tracklist }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setPnr(data.pnr);
      setGenerations((prev) => [data.generation, ...prev]);
      localStorage.setItem(STORAGE_KEY, data.pnr);
      setTracklist("");
    } catch {
      setError("Failed to generate names, please try again");
    } finally {
      setLoading(false);
    }
  }

  async function handleResume() {
    if (!resumeInput.trim()) return;
    setError(null);
    await loadSession(resumeInput.trim().toUpperCase());
    setResumeInput("");
  }

  function handleCopy() {
    if (!pnr) return;
    navigator.clipboard.writeText(pnr);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12">
      <main className="mx-auto flex max-w-2xl flex-col gap-8">
        <header className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold">Playlist Name Synthesizer</h1>
          {pnr && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-neutral-500">Your PNR:</span>
              <code className="rounded bg-neutral-200 px-2 py-1 font-mono">{pnr}</code>
              <button onClick={handleCopy} className="text-neutral-500 underline">
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </header>

        <section className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter PNR to resume"
            value={resumeInput}
            onChange={(e) => setResumeInput(e.target.value)}
            className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm"
          />
          <button
            onClick={handleResume}
            className="rounded-md border border-neutral-300 px-3 py-2 text-sm"
          >
            Resume
          </button>
        </section>

        <section className="flex flex-col gap-3">
          <textarea
            value={tracklist}
            onChange={(e) => setTracklist(e.target.value)}
            placeholder={"Artist - Track Name\nArtist - Track Name\nArtist - Track Name"}
            rows={8}
            className="w-full rounded-md border border-neutral-300 px-3 py-2 font-mono text-sm"
          />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading || !tracklist.trim()}
            className="self-start rounded-md bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </section>

        {generations.length > 0 && (
          <section className="flex flex-col gap-4">
            {generations.map((g) => (
              <GenerationCard key={g._id} pnr={pnr!} generation={g} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
