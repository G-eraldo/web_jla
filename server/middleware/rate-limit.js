const WINDOWS = {
  '/api/checkout': { limit: 5, milliseconds: 15 * 60 * 1000 },
  '/api/retractation': { limit: 3, milliseconds: 60 * 60 * 1000 },
  '/api/mondial-relay/points': { limit: 20, milliseconds: 60 * 1000 },
  '/api/mollie/status': { limit: 20, milliseconds: 60 * 1000 },
}

const attempts = new Map()

export default defineEventHandler((event) => {
  const rule = WINDOWS[getRequestURL(event).pathname]
  if (!rule) return
  const key = `${getRequestIP(event, { xForwardedFor: true }) || 'unknown'}:${getRequestURL(event).pathname}`
  const now = Date.now()
  const current = (attempts.get(key) || []).filter((timestamp) => timestamp > now - rule.milliseconds)
  if (current.length >= rule.limit) {
    setHeader(event, 'Retry-After', Math.ceil((current[0] + rule.milliseconds - now) / 1000))
    throw createError({ statusCode: 429, message: 'Trop de demandes. Veuillez réessayer dans quelques instants.' })
  }
  current.push(now)
  attempts.set(key, current)
})
