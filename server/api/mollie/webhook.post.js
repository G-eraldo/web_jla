import { createMollieClient } from '@mollie/api-client'
import { findOrderByDocumentId, findOrderByPaymentId, orderDocumentId, synchronizeOrderPayment, webhookPaymentId } from '../../utils/mollie-order.js'
import { requestAutomaticRefund } from '../../utils/mollie-refund.js'
import { enforceRateLimit, enforceRequestSize } from '../../utils/request-security.js'

export default defineEventHandler(async event => {
  enforceRateLimit(event, { name: 'mollie-webhook', limit: 120, windowMs: 60 * 1000 })
  enforceRequestSize(event, 8 * 1024)
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })
  const payload = await readBody(event)
  const paymentId = webhookPaymentId(payload)
  if (!paymentId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de paiement manquant.' })

  const client = createMollieClient({ apiKey: config.mollieApiKey })
  const payment = await client.payments.get(paymentId)
  const documentId = orderDocumentId(payment.metadata)
  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  const order = documentId
    ? await findOrderByDocumentId(strapiUrl, documentId)
    : await findOrderByPaymentId(strapiUrl, payment.id)
  const result = await synchronizeOrderPayment(strapiUrl, order, payment)
  if (result.refundRequired) await requestAutomaticRefund(client, strapiUrl, order, payment)
  return { ok: true }
})
