import { createMollieClient } from '@mollie/api-client'
import { randomUUID } from 'node:crypto'
import { isValidPickupSelection } from '../utils/delivery.js'
import { validateMondialRelayPoint } from '../utils/sendcloud-service-points.js'
import { aggregateCartLines } from '../utils/checkout.js'
import { enforceRateLimit } from '../utils/request-security.js'

function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) throw createError({ statusCode: 503, statusMessage: 'La boutique est en cours de configuration.' })
  return { Authorization: `Bearer ${token}` }
}

function makeReference() {
  return `JLA-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export default defineEventHandler(async event => {
  enforceRateLimit(event, { name: 'checkout', limit: 5, windowMs: 10 * 60 * 1000 })
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })
  if (Number(getHeader(event, 'content-length') || 0) > 20_000) throw createError({ statusCode: 413, statusMessage: 'La demande est trop volumineuse.' })

  const body = await readBody(event)
  const lines = aggregateCartLines(body?.items)
  const customer = body?.customer || {}
  const delivery = body?.delivery || {}
  const requiredCustomerFields = ['firstName', 'lastName', 'email', 'phone', 'addressLine1', 'postalCode', 'city']
  if (!lines.length || requiredCustomerFields.some(field => !String(customer[field] || '').trim() || String(customer[field]).trim().length > 200)) throw createError({ statusCode: 400, statusMessage: 'Veuillez compléter vos informations de livraison.' })
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(customer.email).trim()) || !/^\d{5}$/.test(String(customer.postalCode).trim())) throw createError({ statusCode: 400, statusMessage: 'Vos coordonnées de livraison sont invalides.' })
  if (!['home', 'pickup'].includes(delivery.method) || !isValidPickupSelection(delivery)) throw createError({ statusCode: 400, statusMessage: 'Veuillez sélectionner un point relais Mondial Relay.' })
  if (body?.acceptedTerms !== true) throw createError({ statusCode: 400, statusMessage: 'Vous devez accepter les conditions générales de vente.' })

  let pickupPoint = null
  if (delivery.method === 'pickup') {
    try {
      pickupPoint = await validateMondialRelayPoint(delivery.pickupPointId)
    } catch (error) {
      throw createError({ statusCode: error.statusCode || 502, statusMessage: error.message })
    }
  }

  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  try {
    const response = await $fetch(`${strapiUrl}/api/products?fields[0]=documentId&pagination[pageSize]=1`)
    if (!response.data?.length) throw new Error('catalogue vide')
  } catch {
    throw createError({ statusCode: 503, statusMessage: 'Le catalogue est temporairement indisponible. Veuillez réessayer.' })
  }

  if (lines.some(line => line.quantity > 10)) throw createError({ statusCode: 400, statusMessage: 'La quantité maximale par bijou est de 10 exemplaires.' })
  const reference = makeReference()
  let order
  try {
    const created = await $fetch(`${strapiUrl}/api/orders/reserve`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: {
        data: {
          reference,
          customer,
          delivery: {
            method: delivery.method,
            pickupPoint: pickupPoint?.label || null,
            pickupPointId: pickupPoint?.id || null
          },
          promoCode: String(body?.promoCode || '').trim().toUpperCase().slice(0, 40) || null,
          items: lines.map(line => ({ productDocumentId: line.id, quantity: line.quantity }))
        }
      }
    })
    order = created.data
  } catch (error) {
    throw createError({ statusCode: error?.statusCode || 503, statusMessage: error?.data?.error?.message || 'La réservation du stock est temporairement indisponible.' })
  }

  const siteUrl = config.public.siteUrl.replace(/\/$/, '')
  let payment
  try {
    payment = await createMollieClient({ apiKey: config.mollieApiKey }).payments.create({
      amount: { currency: 'EUR', value: Number(order.totalAmount).toFixed(2) },
      description: `Maison JLA · ${reference}`,
      redirectUrl: `${siteUrl}/commande/merci?reference=${encodeURIComponent(reference)}`,
      metadata: { orderDocumentId: order.documentId },
      ...(!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1') ? { webhookUrl: `${siteUrl}/api/mollie/webhook` } : {})
    })
    await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/attach-payment`, {
      method: 'POST', headers: strapiHeaders(), body: { data: { molliePaymentId: payment.id } }
    })
  } catch (error) {
    try {
      await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/release-reservation`, { method: 'POST', headers: strapiHeaders() })
    } catch {}
    throw createError({ statusCode: 502, statusMessage: 'Le paiement est temporairement indisponible. Aucun montant n’a été débité.' })
  }

  return { checkoutUrl: payment.getCheckoutUrl() }
})
