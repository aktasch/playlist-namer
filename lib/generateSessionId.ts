import { randomInt } from "crypto";
import { Collection } from "mongodb";
import { Session } from "./mongodb";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const SESSION_ID_LENGTH = 6;
const MAX_ATTEMPTS = 10;

export function generateSessionId(): string {
  let sessionId = "";
  for (let i = 0; i < SESSION_ID_LENGTH; i++) {
    sessionId += CHARSET[randomInt(CHARSET.length)];
  }
  return sessionId;
}

export async function generateUniqueSessionId(
  collection: Collection<Session>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const sessionId = generateSessionId();
    const existing = await collection.findOne(
      { sessionId },
      { projection: { _id: 1 } },
    );
    if (!existing) {
      return sessionId;
    }
  }
  throw new Error("Failed to generate a unique session ID after multiple attempts");
}
