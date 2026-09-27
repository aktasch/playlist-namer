# Playlist Name Synthesizer

Paste a tracklist and get three AI-generated playlist name suggestions, each with a one-sentence reasoning. Sessions are persistent — resume any previous session by ID.

## Setup

```bash
npm install
```

Create `.env.local`:

```env
MONGODB_URI=...      # MongoDB Atlas connection string
GROQ_API_KEY=...     # groq.com API key
GROQ_MODEL=...       # optional, defaults to openai/gpt-oss-120b
```

```bash
npm run dev
```

## Deploying to Vercel

No `vercel.json` is needed — Vercel auto-detects Next.js.

1. **MongoDB Atlas → Network Access**: allow `0.0.0.0/0` (Vercel functions use dynamic IPs), or use the Vercel ↔ MongoDB Atlas integration, which sets `MONGODB_URI` for you.
2. **Vercel → Add New Project** → import this GitHub repo (framework preset: Next.js, default build settings).
3. **Environment variables** (Production + Preview): `MONGODB_URI`, `GROQ_API_KEY`, optionally `GROQ_MODEL`.
4. Deploy. Pushes to `main` deploy to production automatically.

## How it works

- Enter tracks in `Artist - Track Name` format (minimum 3)
- Click **Generate** to get three name suggestions
- Star favourites to save them
- Your session ID is shown in the header — share or save it to resume later
- On next visit, the last session ID is pre-filled; click **Resume** to reload it

## Stack

- Next.js (App Router) + React
- MongoDB Atlas — sessions stored with a 10-generations-per-document bucketing scheme
- Groq (openai/gpt-oss-120b) via OpenAI-compatible API
