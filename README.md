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
GROQ_MODEL=...       # optional, defaults to llama-3.3-70b-versatile
```

```bash
npm run dev
```

## How it works

- Enter tracks in `Artist - Track Name` format (minimum 3)
- Click **Generate** to get three name suggestions
- Star favourites to save them
- Your session ID is shown in the header — share or save it to resume later
- On next visit, the last session ID is pre-filled; click **Resume** to reload it

## Stack

- Next.js (App Router) + React
- MongoDB Atlas — sessions stored with a 10-generations-per-document bucketing scheme
- Groq (llama-3.3-70b-versatile) via OpenAI-compatible API
