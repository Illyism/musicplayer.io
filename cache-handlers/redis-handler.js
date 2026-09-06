const { createClient } = require('redis')

const CACHE_PREFIX = process.env.NEXT_CACHE_PREFIX || 'rmp:next-cache'
const DEFAULT_TTL_SECONDS = Number(process.env.NEXT_CACHE_TTL_SECONDS || 3600)
const MAX_TTL_SECONDS = Number(process.env.NEXT_CACHE_MAX_TTL_SECONDS || 6 * 60 * 60)
const MAX_ENTRY_BYTES = Number(process.env.NEXT_CACHE_MAX_ENTRY_BYTES || 512 * 1024)

let clientPromise
let warnedMissingUrl = false
let reconnectAfter = 0

function errorMessage(error) {
  return error instanceof Error ? error.message : String(error)
}

function getClient() {
  if (!process.env.REDIS_URL) {
    if (!warnedMissingUrl) {
      console.warn('REDIS_URL is not set; Next remote cache will be disabled.')
      warnedMissingUrl = true
    }
    return null
  }

  if (Date.now() < reconnectAfter) {
    return null
  }

  if (!clientPromise) {
    const client = createClient({
      socket: {
        connectTimeout: Number(process.env.REDIS_CONNECT_TIMEOUT_MS || 5000),
        reconnectStrategy: false,
      },
      url: process.env.REDIS_URL,
    })

    client.on('error', error => {
      console.warn('Redis cache handler error:', errorMessage(error))
    })

    clientPromise = client
      .connect()
      .then(() => client)
      .catch(error => {
        clientPromise = undefined
        reconnectAfter = Date.now() + Number(process.env.REDIS_RETRY_COOLDOWN_MS || 30_000)
        console.warn('Redis cache handler connection failed:', errorMessage(error))
        return null
      })
  }

  return clientPromise
}

function entryKey(cacheKey) {
  return `${CACHE_PREFIX}:entry:${cacheKey}`
}

function tagKey(tag) {
  return `${CACHE_PREFIX}:tag:${tag}`
}

async function streamToBuffer(stream) {
  const reader = stream.getReader()
  const chunks = []

  try {
    while (true) {
      // biome-ignore lint/performance/noAwaitInLoops: sequential stream read
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(Buffer.from(value))
    }
  } finally {
    reader.releaseLock()
  }

  return Buffer.concat(chunks)
}

function bufferToStream(buffer) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(buffer)
      controller.close()
    },
  })
}

function ttlSeconds(entry) {
  const raw = Number(entry.expire || entry.revalidate)
  const ttl = Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_TTL_SECONDS
  return Math.max(60, Math.min(Math.ceil(ttl), MAX_TTL_SECONDS))
}

module.exports = {
  async get(cacheKey, softTags = []) {
    try {
      const client = await getClient()
      if (!client) {
        return
      }

      const key = entryKey(cacheKey)
      const stored = await client.get(key)
      if (!stored) {
        return
      }

      const data = JSON.parse(stored)
      const revalidate = Number(data.revalidate)

      if (Number.isFinite(revalidate) && Date.now() > data.timestamp + revalidate * 1000) {
        await client.del(key).catch(() => undefined)
        return
      }

      const tags = [...(data.tags || []), ...softTags]
      const tagExpiration = await this.getExpiration(tags)
      if (tagExpiration > data.timestamp) {
        return
      }

      return {
        expire: data.expire,
        revalidate: data.revalidate,
        stale: data.stale,
        tags: data.tags || [],
        timestamp: data.timestamp,
        value: bufferToStream(Buffer.from(data.value, 'base64')),
      }
    } catch (error) {
      console.error('Redis cache get failed:', error)
    }
  },

  async getExpiration(tags = []) {
    try {
      if (tags.length === 0) {
        return 0
      }

      const client = await getClient()
      if (!client) {
        return 0
      }

      const values = await client.mGet(tags.map(tagKey))
      return values.reduce((latest, value) => Math.max(latest, Number(value) || 0), 0)
    } catch (error) {
      console.error('Redis cache tag expiration lookup failed:', error)
      return 0
    }
  },

  async refreshTags() {
    // Tag timestamps are read directly from Redis in getExpiration().
  },

  async set(cacheKey, pendingEntry) {
    try {
      const client = await getClient()
      if (!client) {
        return
      }

      const entry = await pendingEntry
      const body = await streamToBuffer(entry.value)

      if (body.length > MAX_ENTRY_BYTES) {
        return
      }

      const payload = JSON.stringify({
        expire: entry.expire,
        revalidate: entry.revalidate,
        stale: entry.stale,
        tags: entry.tags || [],
        timestamp: entry.timestamp,
        value: body.toString('base64'),
      })

      await client.set(entryKey(cacheKey), payload, { EX: ttlSeconds(entry) })
    } catch (error) {
      console.error('Redis cache set failed:', error)
    }
  },

  async updateTags(tags = []) {
    try {
      if (tags.length === 0) {
        return
      }

      const client = await getClient()
      if (!client) {
        return
      }

      const now = String(Date.now())
      const pipeline = client.multi()

      for (const tag of tags) {
        pipeline.set(tagKey(tag), now, { EX: MAX_TTL_SECONDS })
      }

      await pipeline.exec()
    } catch (error) {
      console.error('Redis cache tag update failed:', error)
    }
  },
}
