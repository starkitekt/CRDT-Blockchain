import '@/lib/env';
import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

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

const globalWithIndexFix = global as typeof globalThis & { _indexFixDone?: boolean };

export async function connectDB(): Promise<typeof mongoose> {
    if (!MONGODB_URI) {
        throw new Error('MONGODB_URI is not defined in .env.local');
    }
    if (cache.conn) return cache.conn;
    if (!cache.promise) {
        cache.promise = mongoose.connect(MONGODB_URI, {
            bufferCommands: false,
        });
    }
    cache.conn = await cache.promise;

    if (!globalWithIndexFix._indexFixDone) {
        globalWithIndexFix._indexFixDone = true;
        try {
            const db = cache.conn.connection.db;
            if (db) {
                for (const colName of ['batches', 'labresults', 'recalls']) {
                    try {
                        const col = db.collection(colName);
                        const indexes = await col.indexes();
                        const staleIdx = indexes.find(
                            (i) => i.name === 'id_1' && i.key && (i.key as Record<string, unknown>).id !== undefined
                        );
                        if (staleIdx) {
                            await col.dropIndex('id_1');
                            console.log(`[mongodb] Dropped stale id_1 index on ${colName}`);
                        }
                    } catch { /* collection may not exist yet */ }
                }
            }
        } catch (e) {
            console.warn('[mongodb] Index cleanup skipped:', e);
        }
    }

    return cache.conn;
}
