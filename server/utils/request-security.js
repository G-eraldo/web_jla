const buckets = new Map()

function clientKey(event) {
  return getRequestIP(event, { xForwardedFor: true }) || 'unknown'
}

export function enforceRequestSize(event, maxBytes) {
  const length = Number(getHeader(event, 'content-length') || 0)
  if (Number.isFinite(length) && length > maxBytes) {
    throw createError({ statusCode: 413, statusMessage: 'La requête est trop volumineuse.' })
  }
}

export function enforceRateLimit(event, { name, limit, windowMs }) {
  const now = Date.now()
  const key = `${name}:${clientKey(event)}`
  const previous = buckets.get(key)
  const bucket = !previous || previous.resetAt <= now
    ? { count: 0, resetAt: now + windowMs }
    : previous

  bucket.count += 1
  buckets.set(key, bucket)

  if (buckets.size > 10_000) {
    for (const [bucketKey, value] of buckets) {
      if (value.resetAt <= now) buckets.delete(bucketKey)
    }
  }

  setResponseHeader(event, 'RateLimit-Limit', String(limit))
  setResponseHeader(event, 'RateLimit-Remaining', String(Math.max(0, limit - bucket.count)))
  setResponseHeader(event, 'RateLimit-Reset', String(Math.ceil(bucket.resetAt / 1000)))
  if (bucket.count > limit) {
    setResponseHeader(event, 'Retry-After', String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))))
    throw createError({ statusCode: 429, statusMessage: 'Trop de requêtes. Veuillez réessayer dans quelques instants.' })
  }
}
