import { createMollieClient } from '@mollie/api-client'
import { findOrderByReference, orderDocumentId, synchronizeOrderPayment } from '../../utils/mollie-order.js'
import { requestAutomaticRefund } from '../../utils/mollie-refund.js'
import { enforceRateLimit } from '../../utils/request-security.js'

const referencePattern = /^JLA-\d{8}-[A-F0-9]{8}$/

export default defineEventHandler(async event => {
  enforceRateLimit(event, { name: 'mollie-status', limit: 20, windowMs: 60 * 1000 })
  setHeader(event, 'Cache-Control', 'no-store')
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })

  const reference = String(getQuery(event).reference || '').trim().toUpperCase()
  if (!referencePattern.test(reference)) throw createError({ statusCode: 400, statusMessage: 'Référence de commande invalide.' })

  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  const order = await findOrderByReference(strapiUrl, reference)
  if (!order?.molliePaymentId) return { status: 'pending' }

  const client = createMollieClient({ apiKey: config.mollieApiKey })
  const payment = await client.payments.get(order.molliePaymentId)
  if (orderDocumentId(payment.metadata) !== order.documentId) throw createError({ statusCode: 409, statusMessage: 'Le paiement ne correspond pas à cette commande.' })

  const result = await synchronizeOrderPayment(strapiUrl, order, payment)
  if (result.refundRequired) await requestAutomaticRefund(client, strapiUrl, order, payment)
  return { status: result.status || 'pending' }
})
