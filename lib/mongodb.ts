import { Collection, MongoClient, ObjectId } from "mongodb";

export interface Suggestion {
  name: string;
  reasoning: string;
  starred: boolean;
}

export interface Generation {
  _id: ObjectId;
  tracklist: string[];
  suggestions: Suggestion[];
  createdAt: Date;
}

export interface Session {
  sessionId: string;
  createdAt: Date;
  generations: Generation[];
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  if (process.env.NODE_ENV === "development") {
    if (!global._mongoClientPromise) {
      global._mongoClientPromise = new MongoClient(uri).connect();
    }
    return global._mongoClientPromise;
  }
  return new MongoClient(uri).connect();
}

export async function getSessionsCollection(): Promise<Collection<Session>> {
  const client = await getClientPromise();
  return client.db("playlistNameSynthesizer").collection<Session>("sessions");
}
