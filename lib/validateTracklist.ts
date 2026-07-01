const LINE_PATTERN = /^(\S.*?) - (\S.*)$/;
const MIN_TRACKS = 3;

export type ValidationResult =
  | { valid: true; tracks: string[] }
  | { valid: false; error: string };

export function validateTracklist(raw: string): ValidationResult {
  const lines = raw.split("\n").filter((l) => l.trim() !== "");

  if (lines.length === 0) {
    return { valid: false, error: "Tracklist is empty" };
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const match = LINE_PATTERN.exec(line);
    if (!match) {
      return {
        valid: false,
        error: `Line ${i + 1} is invalid: expected "Artist - Track Name", got "${line}"`,
      };
    }
  }

  if (lines.length < MIN_TRACKS) {
    return {
      valid: false,
      error: `At least ${MIN_TRACKS} tracks are required, got ${lines.length}`,
    };
  }

  return { valid: true, tracks: lines };
}
