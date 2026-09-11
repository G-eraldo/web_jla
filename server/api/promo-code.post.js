import { enforceRateLimit } from '../utils/request-security.js'

function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) throw createError({ statusCode: 503, message: 'La boutique est en cours de configuration.' })
  return { Authorization: `Bearer ${token}` }
}

export default defineEventHandler(async event => {
  enforceRateLimit(event, { name: 'promo-code', limit: 15, windowMs: 10 * 60 * 1000 })
  if (Number(getHeader(event, 'content-length') || 0) > 2_000) {
    throw createError({ statusCode: 413, message: 'La demande est trop volumineuse.' })
  }

  const body = await readBody(event)
  const code = String(body?.code || '').trim().toUpperCase().slice(0, 40)
  const subtotalAmount = Number(body?.subtotalAmount)
  if (!code || !Number.isFinite(subtotalAmount) || subtotalAmount <= 0) {
    throw createError({ statusCode: 400, message: 'Ce code promo est invalide ou expiré.' })
  }

  const config = useRuntimeConfig()
  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  try {
    const response = await $fetch(`${strapiUrl}/api/promo-codes/validate`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: { data: { code, subtotalAmount } }
    })
    return response.data
  } catch (error) {
    const statusCode = error?.statusCode === 400 ? 400 : 503
    const message = statusCode === 400
      ? 'Ce code promo est invalide ou expiré.'
      : 'La vérification du code promo est temporairement indisponible.'
    throw createError({ statusCode, message })
  }
})
