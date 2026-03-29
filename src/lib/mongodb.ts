import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI!;

if (!MONGODB_URI) {
    throw new Error('MONGODB_URI is not defined in .env.local');
}

type MongooseCache = {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
};

const globalWithCache = global as typeof globalThis & {
    _mongooseCache?: MongooseCache;
};

if (!globalWithCache._mongooseCache) {
    globalWithCache._mongooseCache = { conn: null, promise: null };
}

const cache = globalWithCache._mongooseCache;

export async function connectDB(): Promise<typeof mongoose> {
    if (cache.conn) return cache.conn;
    if (!cache.promise) {
        cache.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
        });
    }
    cache.conn = await cache.promise;
    return cache.conn;
}
