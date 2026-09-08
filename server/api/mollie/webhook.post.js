import { createMollieClient } from '@mollie/api-client'
import { findOrderByDocumentId, findOrderByPaymentId, orderDocumentId, synchronizeOrderPayment, webhookPaymentId } from '../../utils/mollie-order.js'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })
  const payload = await readBody(event)
  const paymentId = webhookPaymentId(payload)
  if (!paymentId) throw createError({ statusCode: 400, statusMessage: 'Identifiant de paiement manquant.' })

  const payment = await createMollieClient({ apiKey: config.mollieApiKey }).payments.get(paymentId)
  const documentId = orderDocumentId(payment.metadata)
  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  const order = documentId
    ? await findOrderByDocumentId(strapiUrl, documentId)
    : await findOrderByPaymentId(strapiUrl, payment.id)
  await synchronizeOrderPayment(strapiUrl, order, payment)
  return { ok: true }
})
