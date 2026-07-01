import OpenAI from "openai";

export interface NameSuggestion {
  name: string;
  reasoning: string;
}

const client = new OpenAI({
  baseURL: "https://api.groq.com/openai/v1",
  apiKey: process.env.GROQ_API_KEY,
});

const MODEL = process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile";

export async function generateSuggestions(tracks: string[]): Promise<NameSuggestion[]> {
  const response = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content:
          'You are a creative music curator. Respond ONLY with a valid JSON array — no markdown, no explanation, no code fences. Format: [{"name":"...","reasoning":"..."},{"name":"...","reasoning":"..."},{"name":"...","reasoning":"..."}]',
      },
      {
        role: "user",
        content: `Tracklist:\n\n${tracks.join("\n")}\n\nSuggest exactly three distinct, evocative playlist names. For each name, give one sentence of reasoning grounded in the actual tracks, artists, or vibe.`,
      },
    ],
    temperature: 0.8,
  });

  const text = response.choices[0]?.message?.content ?? "";
  const json = text.replace(/```json?\n?/g, "").replace(/```/g, "").trim();
  const parsed = JSON.parse(json) as NameSuggestion[];
  if (!Array.isArray(parsed) || parsed.length !== 3) {
    throw new Error("Model did not return exactly 3 suggestions");
  }
  return parsed;
}
