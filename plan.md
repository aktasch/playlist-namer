**Playlist Name Synthesizer**

A minimal web app that takes a raw tracklist and generates three playlist name suggestions, with session-based history.

Core concept:
- Input: one track per line, `Artist - Track Name` format, strictly validated
- Backend rejects anything that doesn't match, no exceptions
- AI generates exactly three playlist name options, each with one sentence of reasoning
- Each generation is saved to MongoDB: PNR + tracklist + three names + timestamp

Identity and session:
- On first landing, a PNR-like identifier is generated (based on IP or session) and shown prominently in the UI
- User can copy and save this PNR to return later
- On landing, two paths: start fresh (PNR auto-assigned) or enter an existing PNR and click Resume
- Resume loads the full generation history for that PNR

Storage (MongoDB):
- Collection per session or a sessions collection keyed by PNR
- Each document: PNR, list of generations (each with tracklist, three name suggestions, timestamp)

Open questions to revisit:
- PNR format: purely random, or encoded with something meaningful like a date prefix?
- Should a PNR expire after inactivity?
- History display: timeline of past generations shown below the input after resume?
- Can the user label or star a favorite name from each generation?