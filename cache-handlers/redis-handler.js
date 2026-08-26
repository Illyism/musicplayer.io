const { createClient } = require('redis')

const CACHE_PREFIX = process.env.NEXT_CACHE_PREFIX || 'rmp:next-cache'
const TAG_SET_KEY = `${CACHE_PREFIX}:revalidated-tags`

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

function redisSetOptions(entry) {
  const ttl = Number(entry.expire || entry.revalidate)

  if (Number.isFinite(ttl) && ttl > 0) {
    return { EX: Math.ceil(ttl) }
  }
}

module.exports = {
  async get(cacheKey, softTags = []) {
    try {
      const client = await getClient()
      if (!client) {
        return
      }

      const stored = await client.get(entryKey(cacheKey))
      if (!stored) {
        return
      }

      const data = JSON.parse(stored)
      const now = Date.now()
      const revalidate = Number(data.revalidate)

      if (Number.isFinite(revalidate) && now > data.timestamp + revalidate * 1000) {
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
      const payload = JSON.stringify({
        expire: entry.expire,
        revalidate: entry.revalidate,
        stale: entry.stale,
        tags: entry.tags || [],
        timestamp: entry.timestamp,
        value: body.toString('base64'),
      })

      const options = redisSetOptions(entry)
      if (options) {
        await client.set(entryKey(cacheKey), payload, options)
      } else {
        await client.set(entryKey(cacheKey), payload)
      }
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
        pipeline.set(tagKey(tag), now)
        pipeline.sAdd(TAG_SET_KEY, tag)
      }

      await pipeline.exec()
    } catch (error) {
      console.error('Redis cache tag update failed:', error)
    }
  },
}
