import { randomInt } from "crypto";
import { Collection } from "mongodb";
import { Session } from "./mongodb";

const CHARSET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const PNR_LENGTH = 6;
const MAX_ATTEMPTS = 10;

export function generatePnr(): string {
  let pnr = "";
  for (let i = 0; i < PNR_LENGTH; i++) {
    pnr += CHARSET[randomInt(CHARSET.length)];
  }
  return pnr;
}

export async function generateUniquePnr(
  collection: Collection<Session>,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const pnr = generatePnr();
    const existing = await collection.findOne({ pnr }, { projection: { _id: 1 } });
    if (!existing) {
      return pnr;
    }
  }
  throw new Error("Failed to generate a unique PNR after multiple attempts");
}
