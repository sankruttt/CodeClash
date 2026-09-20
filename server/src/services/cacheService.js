import 'dotenv/config';

// ============================================================
// CACHE SERVICE
//
// Purpose: provide a shared, Redis-ready cache used by the
// leaderboard and match-history read paths.
//
// Backend selection (automatic):
//   - When UPSTASH_REDIS_REST_URL is configured we use the
//     Upstash Redis REST API over plain global `fetch` (Vercel
//     serverless friendly, no native deps, no client library).
//   - Otherwise an in-process in-memory Map is used. This is
//     only correct on a single non-shared runtime; for shared
//     deployments (Vercel serverless) you MUST set the Upstash
//     env vars so all warm instances see one cache.
//
// Redis is the source of truth ONLY for short-lived cache TTLs.
// MongoDB is always the source of truth for data — cache reads
// degrade to a DB query on any cache failure.
// ============================================================

const REDIS_REST_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_REST_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

const TTL_DEFAULT = 30; // seconds

// ============== ENV-CONFIGURABLE TTLs ==============
export const CACHE_TTL = {
  // Leaderboard is refreshed in 30–60s
  leaderboard: parseInt(process.env.CACHE_TTL_LEADERBOARD, 10) || 45,
  // Individual match history is refreshed in 10–30s
  matchHistory: parseInt(process.env.CACHE_TTL_MATCH_HISTORY, 10) || 20
};

// ============== IN-MEMORY FALLBACK ==============

const memoryStore = new Map(); // key -> { value, expiresAt }

function memoryGet(key) {
  const entry = memoryStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt && entry.expiresAt <= Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  return entry.value;
}

function memorySet(key, value, ttlSeconds) {
  memoryStore.set(key, {
    value,
    expiresAt: Date.now() + (ttlSeconds || TTL_DEFAULT) * 1000
  });
}

function memoryDel(key) {
  memoryStore.delete(key);
}

function memoryDelPrefix(prefix) {
  for (const key of memoryStore.keys()) {
    if (key.startsWith(prefix)) {
      memoryStore.delete(key);
    }
  }
}

// ============== UPSTASH REDIS REST BACKEND ==============

let redisWarned = false;

function warnRedisOnce(action, err) {
  if (redisWarned) return;
  redisWarned = true;
  console.warn(`[cacheService] Redis ${action} failed, falling back to DB reads:`, err?.message || err);
}

function redisUrl() {
  return REDIS_REST_URL.replace(/\/$/, '');
}

async function redisCommand(path) {
  const res = await fetch(`${redisUrl()}/${path}`, {
    headers: REDIS_REST_TOKEN ? { Authorization: `Bearer ${REDIS_REST_TOKEN}` } : {}
  });
  if (!res.ok) {
    throw new Error(`Redis REST returned ${res.status}`);
  }
  return res.json();
}

async function redisGet(key) {
  const data = await redisCommand(`get/${encodeURIComponent(key)}`);
  const raw = data?.result;
  if (raw == null) return null;
  try {
    return JSON.parse(raw);
  } catch {
    try {
      return JSON.parse(decodeURIComponent(raw));
    } catch {
      return null;
    }
  }
}

async function redisSet(key, value, ttlSeconds) {
  const encoded = encodeURIComponent(JSON.stringify(value));
  await redisCommand(`set/${encodeURIComponent(key)}/${encoded}?EX=${ttlSeconds || TTL_DEFAULT}`);
}

async function redisDel(key) {
  await redisCommand(`del/${encodeURIComponent(key)}`);
}

async function redisDelPrefix(prefix) {
  let cursor = '0';
  do {
    // SCAN returns [cursor, [keys]]
    const data = await redisCommand(`scan/${cursor}?count=1000&match=${encodeURIComponent(prefix)}*`);
    const result = data?.result || ['0', []];
    cursor = String(result[0]);
    const keys = result[1] || [];
    if (keys.length > 0) {
      await redisCommand(`del/${keys.map((k) => encodeURIComponent(k)).join('/')}`);
    }
  } while (cursor && cursor !== '0');
}

// ============== PUBLIC API (backend-agnostic) ==============

export function cacheBackendName() {
  return REDIS_REST_URL ? 'upstash-redis' : 'memory';
}

async function backendGet(key) {
  try {
    return REDIS_REST_URL ? await redisGet(key) : memoryGet(key);
  } catch (err) {
    warnRedisOnce('get', err);
    return null;
  }
}

async function backendSet(key, value, ttlSeconds) {
  try {
    if (REDIS_REST_URL) {
      await redisSet(key, value, ttlSeconds);
    } else {
      memorySet(key, value, ttlSeconds);
    }
  } catch (err) {
    warnRedisOnce('set', err);
  }
}

async function backendDel(key) {
  try {
    if (REDIS_REST_URL) {
      await redisDel(key);
    } else {
      memoryDel(key);
    }
  } catch (err) {
    warnRedisOnce('del', err);
  }
}

async function backendDelPrefix(prefix) {
  try {
    if (REDIS_REST_URL) {
      await redisDelPrefix(prefix);
    } else {
      memoryDelPrefix(prefix);
    }
  } catch (err) {
    warnRedisOnce('delPrefix', err);
  }
}

export async function cacheGet(key) {
  return backendGet(key);
}

export async function cacheSet(key, value, ttlSeconds) {
  return backendSet(key, value, ttlSeconds);
}

export async function cacheDel(key) {
  return backendDel(key);
}

export async function cacheDelPrefix(prefix) {
  return backendDelPrefix(prefix);
}

/**
 * getOrSet — fetch from cache, else load via loader, store, and
 * return. Concurrent callers for the same key share a single
 * in-flight loader (prevents stampede on cache misses).
 */
const inFlight = new Map();

export async function getOrSet(key, ttlSeconds, loader) {
  const cached = await backendGet(key);
  if (cached !== null && cached !== undefined) return cached;

  if (inFlight.has(key)) {
    return inFlight.get(key);
  }

  const promise = Promise.resolve()
    .then(() => loader())
    .then((value) => {
      if (value !== null && value !== undefined) {
        return backendSet(key, value, ttlSeconds).then(() => value);
      }
      return value;
    })
    .finally(() => {
      inFlight.delete(key);
    });

  inFlight.set(key, promise);
  return promise;
}

// ============== DOMAIN INVALIDATION HELPERS ==============

/**
 * Called AFTER a match has been finalized and both players'
 * ratings have already been persisted. Should NEVER be called
 * before the authoritative DB write succeeds.
 */
export async function invalidateMatchCaches({ playerIds = [] } = {}) {
  const tasks = [invalidLeaderboardCache()];
  for (const id of playerIds) {
    if (id) tasks.push(invalidMatchHistoryCache(id));
  }
  return Promise.all(tasks);
}

export function invalidLeaderboardCache() {
  return cacheDelPrefix('leaderboard:');
}

export function invalidMatchHistoryCache(userId) {
  if (!userId) return Promise.resolve();
  return cacheDel(`match-history:${userId}`);
}

export default {
  CACHE_TTL,
  cacheBackendName,
  cacheGet,
  cacheSet,
  cacheDel,
  cacheDelPrefix,
  getOrSet,
  invalidateMatchCaches
};