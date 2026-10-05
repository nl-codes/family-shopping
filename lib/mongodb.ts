import mongoose from "mongoose";
const globalCache = globalThis as typeof globalThis & {
  mongo?: {
    connection: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
  };
};
const cache = (globalCache.mongo ??= { connection: null, promise: null });
export async function connectDB() {
  if (cache.connection) return cache.connection;
  const uri = process.env.MONGODB_URI;
  if (!uri)
    throw new Error(
      "Set MONGODB_URI in .env.local to connect your family database.",
    );
  cache.promise ??= mongoose.connect(uri, {
    bufferCommands: false,
    maxPoolSize: 5,
    serverSelectionTimeoutMS: 5000,
  });
  try {
    cache.connection = await cache.promise;
    return cache.connection;
  } catch (error) {
    cache.promise = null;
    throw error;
  }
}
