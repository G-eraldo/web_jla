import { createMollieClient } from '@mollie/api-client'

const statuses = new Set(['pending', 'paid', 'failed', 'canceled', 'expired'])

function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) throw createError({ statusCode: 503, statusMessage: 'La boutique est en cours de configuration.' })
  return { Authorization: `Bearer ${token}` }
}

function orderDocumentId(metadata) {
  if (metadata && typeof metadata === 'object') return metadata.orderDocumentId
  try { return JSON.parse(metadata || '{}').orderDocumentId } catch { return null }
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })
  const payload = await readBody(event)
  const paymentId = typeof payload?.id === 'string' ? payload.id : null
  if (!paymentId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de paiement manquant.' })

  const payment = await createMollieClient({ apiKey: config.mollieApiKey }).payments.get(paymentId)
  const documentId = orderDocumentId(payment.metadata)
  const status = statuses.has(payment.status) ? payment.status : 'pending'
  if (!documentId) return { ok: true }

  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  const response = await $fetch(`${strapiUrl}/api/orders/${documentId}?fields[0]=molliePaymentId&fields[1]=paymentStatus&fields[2]=confirmationEmailSentAt`, { headers: strapiHeaders() })
  const order = response.data
  const needsConfirmationRetry = status === 'paid' && !order?.confirmationEmailSentAt
  if (!order || order.molliePaymentId !== payment.id || (order.paymentStatus === status && !needsConfirmationRetry)) return { ok: true }

  const data = { paymentStatus: status }
  if (status === 'paid') data.paidAt = payment.paidAt || new Date().toISOString()
  await $fetch(`${strapiUrl}/api/orders/${documentId}`, { method: 'PUT', headers: strapiHeaders(), body: { data } })
  return { ok: true }
})
