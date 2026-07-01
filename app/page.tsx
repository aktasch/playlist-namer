"use client";

import { useEffect, useState } from "react";
import GenerationCard from "@/components/GenerationCard";

const STORAGE_KEY = "playlistNamerSessionId";

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
  sessionId: string;
  generations: Generation[];
}

export default function Home() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [tracklist, setTracklist] = useState("");
  const [resumeInput, setResumeInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) setResumeInput(stored);
  }, []);

  async function loadSession(targetSessionId: string) {
    try {
      const res = await fetch(`/api/sessions/${targetSessionId}`);
      if (!res.ok) {
        if (res.status === 404) setError("Session ID not found");
        return;
      }
      const session: Session = await res.json();
      setSessionId(session.sessionId);
      setGenerations(session.generations);
      localStorage.setItem(STORAGE_KEY, session.sessionId);
      setError(null);
    } catch {
      setError("Failed to load session");
    }
  }

  async function handleGenerate() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sessionId ?? undefined, tracklist }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      setSessionId(data.sessionId);
      setGenerations((prev) => [data.generation, ...prev]);
      localStorage.setItem(STORAGE_KEY, data.sessionId);
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
    if (!sessionId) return;
    navigator.clipboard.writeText(sessionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen bg-[#F9FBFA]">
      <header className="bg-[#001E2B] px-4 py-5">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <h1 className="text-lg font-semibold text-white">
            Playlist Name Synthesizer
          </h1>
          {sessionId && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#889397]">Session ID</span>
              <code className="rounded bg-[#0A2E3D] px-2 py-1 font-mono text-[#00ED64]">
                {sessionId}
              </code>
              <button
                onClick={handleCopy}
                className="text-[#889397] underline hover:text-white"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="mx-auto flex max-w-2xl flex-col gap-8 px-4 py-10">
        <section className="flex items-center gap-2">
          <input
            type="text"
            placeholder="Enter Session ID to resume"
            value={resumeInput}
            onChange={(e) => setResumeInput(e.target.value)}
            className="flex-1 rounded-md border border-[#C1C7C6] bg-white px-3 py-2 text-sm text-[#001E2B] focus:border-[#00684A] focus:outline-none"
          />
          <button
            onClick={handleResume}
            className="rounded-md border border-[#00684A] px-3 py-2 text-sm font-medium text-[#00684A] hover:bg-[#E3FCF7]"
          >
            Resume
          </button>
        </section>

        <section className="flex flex-col gap-3 rounded-lg border border-[#E8EDEB] bg-white p-5 shadow-sm">
          <textarea
            value={tracklist}
            onChange={(e) => setTracklist(e.target.value)}
            placeholder={"Artist - Track Name\nArtist - Track Name\nArtist - Track Name"}
            rows={8}
            className="w-full rounded-md border border-[#C1C7C6] px-3 py-2 font-mono text-sm text-[#001E2B] focus:border-[#00684A] focus:outline-none"
          />
          {error && <p className="text-sm text-[#C0383B]">{error}</p>}
          <button
            onClick={handleGenerate}
            disabled={loading || !tracklist.trim()}
            className="self-start rounded-md bg-[#00ED64] px-4 py-2 text-sm font-semibold text-[#001E2B] hover:bg-[#00D45C] disabled:opacity-50"
          >
            {loading ? "Generating..." : "Generate"}
          </button>
        </section>

        {generations.length > 0 && (
          <section className="flex flex-col gap-4">
            {generations.map((g) => (
              <GenerationCard key={g._id} sessionId={sessionId!} generation={g} />
            ))}
          </section>
        )}
      </main>
    </div>
  );
}
