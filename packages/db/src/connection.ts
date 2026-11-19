import mongoose from 'mongoose';

type CachedConnection = {
  connection: typeof mongoose | null;
  pending: Promise<typeof mongoose> | null;
  /** The URI the cached pool belongs to, so a changed URI opens a new one. */
  uri?: string;
};

// Serverless functions reuse a process across requests; a global cache avoids opening a
// new pool on every invocation and avoids HMR leaks in development.
const globalCache = globalThis as typeof globalThis & { pathshalaMongo?: CachedConnection };
const cache: CachedConnection = globalCache.pathshalaMongo ?? { connection: null, pending: null };
globalCache.pathshalaMongo = cache;

/**
 * Connect to MongoDB once per process and reuse the pool.
 * Throws a plain Error when the URI is missing; callers decide how to surface that.
 */
export async function connectToDatabase(): Promise<typeof mongoose> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not configured');
  }

  if (cache.connection && cache.uri === uri) return cache.connection;
  // A test file may start its own in-memory server in the same process; reconnecting
  // keeps that file's rows out of the previous file's database.
  if (cache.connection && cache.uri !== uri) await disconnectFromDatabase();

  if (!cache.pending) {
    cache.pending = mongoose.connect(uri, {
      dbName: process.env.MONGODB_DB ?? 'pathshala',
      // The front end should fail fast instead of buffering while the pool is unavailable.
      bufferCommands: false,
    });
  }

  try {
    cache.connection = await cache.pending;
    cache.uri = uri;
    return cache.connection;
  } catch (error) {
    cache.pending = null;
    throw error;
  }
}

/** Close the pooled connection, mainly for integration tests and scripts. */
export async function disconnectFromDatabase(): Promise<void> {
  await mongoose.disconnect();
  cache.connection = null;
  cache.pending = null;
  delete cache.uri;
}
