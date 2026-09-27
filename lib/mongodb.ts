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
  trackCount: number;
  generationMs: number;
  userAgent: string | null;
  country: string | null;
  city: string | null;
  referer: string | null;
}

export const MAX_GENERATIONS_PER_BUCKET = 10;

export interface Session {
  sessionId: string;
  createdAt: Date;
  generations: Generation[];
  bucketSeq: number;
  previousBucketId: ObjectId | null;
  isLatest: boolean;
}

declare global {
  var _mongoClientPromise: Promise<MongoClient> | undefined;
}

function getClientPromise(): Promise<MongoClient> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("Missing MONGODB_URI environment variable");
  }

  // Cache the client in every environment: dev hot reloads and warm
  // serverless instances (e.g. Vercel) reuse one connection pool.
  if (!global._mongoClientPromise) {
    global._mongoClientPromise = new MongoClient(uri, { maxPoolSize: 10 })
      .connect()
      .catch((err) => {
        global._mongoClientPromise = undefined;
        throw err;
      });
  }
  return global._mongoClientPromise;
}

export async function getSessionsCollection(): Promise<Collection<Session>> {
  const client = await getClientPromise();
  return client.db("playlistNameSynthesizer").collection<Session>("sessions");
}

export async function createSession(
  collection: Collection<Session>,
  sessionId: string,
): Promise<void> {
  await collection.insertOne({
    sessionId,
    createdAt: new Date(),
    generations: [],
    bucketSeq: 1,
    previousBucketId: null,
    isLatest: true,
  });
}

export async function appendGeneration(
  collection: Collection<Session>,
  sessionId: string,
  generation: Generation,
): Promise<void> {
  const result = await collection.updateOne(
    {
      sessionId,
      isLatest: true,
      $expr: { $lt: [{ $size: "$generations" }, MAX_GENERATIONS_PER_BUCKET] },
    },
    { $push: { generations: generation } },
  );

  if (result.matchedCount > 0) {
    return;
  }

  // Latest bucket is full (or missing) — roll over to a new bucket.
  const latest = await collection.findOne(
    { sessionId, isLatest: true },
    { sort: { bucketSeq: -1 } },
  );

  if (!latest) {
    throw new Error(`No session found for sessionId ${sessionId}`);
  }

  await collection.updateOne(
    { _id: latest._id },
    { $set: { isLatest: false } },
  );

  await collection.insertOne({
    sessionId,
    createdAt: new Date(),
    generations: [generation],
    bucketSeq: latest.bucketSeq + 1,
    previousBucketId: latest._id,
    isLatest: true,
  });
}

export async function getMergedSession(
  collection: Collection<Session>,
  sessionId: string,
): Promise<{ sessionId: string; createdAt: Date; generations: Generation[] } | null> {
  const buckets = await collection
    .find({ sessionId })
    .sort({ bucketSeq: 1 })
    .toArray();

  if (buckets.length === 0) {
    return null;
  }

  return {
    sessionId,
    createdAt: buckets[0].createdAt,
    generations: buckets.flatMap((bucket) => bucket.generations),
  };
}
