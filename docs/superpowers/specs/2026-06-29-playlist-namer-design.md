# Playlist Name Synthesizer — Design

## Context

A minimal web app: paste a tracklist, get three AI-generated playlist name
suggestions with reasoning. Each generation is saved to MongoDB under a
session identified by a PNR-like code, so users can return later and see
their history. This design resolves the open questions left in the original
`plan.md` and fixes the concrete architecture, data model, and contracts
needed to implement it.

## Stack

- **Framework:** Next.js 15 (App Router, TypeScript) — single deployable app,
  API routes serve as the backend.
- **Styling:** Tailwind CSS.
- **Database:** MongoDB Atlas via the official Node driver.
- **AI:** Anthropic SDK, Claude Haiku 4.5, using forced tool-use for
  structured output.

## Data Model

Single `sessions` collection, keyed by PNR:

```ts
{
  pnr: string,              // e.g. "7XK9P2"
  createdAt: Date,
  generations: [
    {
      _id: ObjectId,
      tracklist: string[],   // raw "Artist - Track Name" lines, validated
      suggestions: [
        { name: string, reasoning: string, starred: boolean }
        // exactly 3 entries
      ],
      createdAt: Date
    }
  ]
}
```

No TTL/expiry on sessions. No cap on generation history length. These can be
added later if storage growth becomes a concern, but are out of scope now.

## Validation

Tracklist input is a textarea, one track per line, format `Artist - Track Name`.

- Split strictly on newlines — blank lines are **not** skipped, matching the
  "no exceptions" requirement from plan.md.
- Each line must match: non-empty artist, exactly one ` - ` (space-dash-space)
  separator, non-empty track name. Whitespace-only segments are invalid.
- Minimum 3 valid lines required for a submission.
- **All-or-nothing rejection:** if any single line fails the format, the
  entire submission is rejected with an error identifying the failing line
  (e.g. `"Line 3 is invalid: missing ' - ' separator"`). No partial
  processing, no silent dropping of bad lines.

Implemented as a pure function (e.g. `lib/validateTracklist.ts`) shared by
the API route and reusable by client-side pre-validation if desired.

## PNR Generation

- 6 characters, uppercase `A-Z0-9`, generated via a cryptographically random
  source.
- On creation, check uniqueness against the `sessions` collection; retry on
  the rare collision.
- A PNR is only created when the user successfully submits their **first**
  valid tracklist — not eagerly on page load. This avoids empty/unused
  session documents.

## Claude Integration

- Model: Claude Haiku 4.5.
- Forced tool-use with an input schema requiring exactly 3 entries:
  ```ts
  { suggestions: [{ name: string, reasoning: string }, ...] }  // length 3
  ```
- Prompt includes the validated tracklist and asks for 3 distinct playlist
  names, each with one sentence of reasoning grounded in the actual
  tracks/artists/vibe — not generic.
- On API failure (network, rate limit, etc.): no retry logic, no fallback
  names. Return a 502 with a generic message; the user resubmits manually.

## API Routes

- **`POST /api/generate`**
  Body: `{ pnr?: string, tracklist: string }` (raw textarea text).
  - Validates the tracklist (see above); 400 with line-specific error on
    failure.
  - If `pnr` is provided, loads that session (404 if not found).
  - If no `pnr`, generates a new one and creates the session document.
  - Calls Claude, appends the new generation, persists, returns
    `{ pnr, generation }`.

- **`GET /api/sessions/[pnr]`**
  Returns the full session document (404 if not found). Used by the Resume
  flow and on page load when a PNR is already known.

- **`PATCH /api/sessions/[pnr]/generations/[generationId]/star`**
  Body: `{ suggestionIndex: number }` (0–2). Toggles that suggestion's
  `starred` boolean.

## Frontend

Single page (`app/page.tsx`) plus a few presentational components.

- **On mount:** read `localStorage.getItem('playlistNamerPnr')`. If present,
  fetch that session via `GET /api/sessions/[pnr]` and render its history.
- **PNR display:** shown prominently (header/badge) once known, with a
  copy-to-clipboard control.
- **Resume flow:** a PNR input + "Resume" button lets the user switch to a
  different session. On success, overwrites `localStorage` and re-renders.
- **Generation form:** textarea (placeholder demonstrates the
  `Artist - Track Name` format, one per line) + "Generate" button.
  - Inline error banner shows validation failures (which line, what's wrong).
  - Button disabled while a request is in flight.
- **History:** rendered below the form, newest generation first. Each card
  shows the tracklist used, the 3 suggestions with their reasoning, and a
  star toggle (☆ / ★) per suggestion. A new generation prepends to the
  visible list immediately using the API response (no full reload).

## Error Handling

- Client: disable submit while in-flight; inline banner for validation (400)
  or server (404/500/502) errors; no sensitive error detail leaked to the UI.
- Server: 400 for invalid tracklist input, 404 for unknown PNR on resume,
  502 for Claude API failures, 500 for unexpected/DB errors.

## Environment

`.env.local` (not committed): `ANTHROPIC_API_KEY`, `MONGODB_URI`.

## Out of Scope (v1)

- PNR expiry / TTL
- History pagination or capping
- Auth beyond PNR-as-identity
- Editing or deleting past generations
- Retry/backoff on AI call failures
