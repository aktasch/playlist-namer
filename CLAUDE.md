# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build
npm run lint     # eslint
npx tsc --noEmit # type-check without emitting
```

No test suite exists. `npm run lint` currently reports one existing `react-hooks/set-state-in-effect` error in `app/page.tsx`. It doesn't block builds, because `next build` doesn't run lint in Next 16.

## Environment variables

Required in `.env.local`:

```env
MONGODB_URI=...        # MongoDB Atlas connection string
GROQ_API_KEY=...       # Groq API key
GROQ_MODEL=...         # optional, defaults to llama-3.3-70b-versatile
```

## Architecture

Single-page Next.js app (App Router). All state lives client-side in `app/page.tsx` — no server components except the API routes.

**Data flow:**

1. User submits a tracklist → `POST /api/generate` → validates → calls Groq → stores in MongoDB → returns the new generation
2. User resumes a session → `GET /api/sessions/[sessionId]` → merges all buckets → returns full history

**MongoDB storage (`playlistNameSynthesizer` db, `sessions` collection):**  
Sessions use a bucketing scheme: each MongoDB document holds up to 10 generations (`MAX_GENERATIONS_PER_BUCKET`). When a bucket fills, a new document is inserted with `previousBucketId` pointing to the prior one and `isLatest: true`. `getMergedSession` in `lib/mongodb.ts` walks all buckets in `bucketSeq` order and flattens them into a single generations array.

**Session IDs** are 6-character alphanumeric strings (A–Z, 0–9) generated via `crypto.randomInt` with collision-retry logic (`lib/generateSessionId.ts`). The last used session ID is stored in `localStorage` and pre-filled into the resume input on load — the user must explicitly click Resume to reload it.

**Tracklist validation** (`lib/validateTracklist.ts`): every non-blank line must match `Artist - Track Name`, and at least 3 tracks are required. It is strict: one bad line rejects the whole request with a line-numbered error.

**LLM integration** (`lib/generateNames.ts`): uses the `openai` package pointed at `https://api.groq.com/openai/v1`. Requests plain JSON output (no tool use) and strips any markdown fences the model may wrap around the response. The response must be exactly 3 suggestions, otherwise the route returns 502.

**Schema changes** have no migration tooling. Past changes (the `pnr` → `sessionId` rename and the bucketing fields) were applied by hand to the live Atlas data. `dump/` is a local, gitignored `mongodump` backup.

**API routes:**

- `POST /api/generate` — validates tracklist, creates or resolves session, calls Groq, appends generation
- `GET /api/sessions/[sessionId]` — returns merged session
- `POST /api/sessions/[sessionId]/generations/[generationId]/star` — toggles starred on a suggestion

## Deployment (Vercel)

Deployed on Vercel from GitHub (`main` deploys to production). There's no `vercel.json`; Next.js is auto-detected. Env vars are set in the Vercel project, and Atlas network access allows `0.0.0.0/0` because Vercel's IPs are dynamic.

Keep these serverless-safe patterns:

- `getClientPromise()` in `lib/mongodb.ts` caches one `MongoClient` on `global` in **every** environment and clears the cache when a connection fails. Never create a client per request, or Atlas will run out of connections.
- The Groq client is created on first use (`getClient()`), so `next build` doesn't need `GROQ_API_KEY`.
- `app/api/generate/route.ts` exports `maxDuration = 30`. Routes must stay on the Node.js runtime because the `mongodb` driver doesn't run on Edge.
- Generations store `x-vercel-ip-country` / `x-vercel-ip-city` headers; these are `null` locally.
