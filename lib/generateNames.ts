import Anthropic from "@anthropic-ai/sdk";

export interface NameSuggestion {
  name: string;
  reasoning: string;
}

const client = new Anthropic();

const SUGGESTIONS_TOOL: Anthropic.Tool = {
  name: "submit_suggestions",
  description: "Submit exactly three playlist name suggestions, each with one sentence of reasoning.",
  input_schema: {
    type: "object",
    properties: {
      suggestions: {
        type: "array",
        minItems: 3,
        maxItems: 3,
        items: {
          type: "object",
          properties: {
            name: { type: "string", description: "The playlist name" },
            reasoning: {
              type: "string",
              description: "One sentence explaining why this name fits the tracklist",
            },
          },
          required: ["name", "reasoning"],
        },
      },
    },
    required: ["suggestions"],
  },
};

export async function generateSuggestions(tracks: string[]): Promise<NameSuggestion[]> {
  const response = await client.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 1024,
    tools: [SUGGESTIONS_TOOL],
    tool_choice: { type: "tool", name: "submit_suggestions" },
    messages: [
      {
        role: "user",
        content: `Here is a tracklist:\n\n${tracks.join("\n")}\n\nSuggest exactly three distinct, evocative playlist names for this tracklist. For each name, give one sentence of reasoning grounded in the actual tracks, artists, or vibe of this specific list.`,
      },
    ],
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
  );
  if (!toolUse) {
    throw new Error("Claude did not return a tool_use block");
  }

  const input = toolUse.input as { suggestions: NameSuggestion[] };
  return input.suggestions;
}
