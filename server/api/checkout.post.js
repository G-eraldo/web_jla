import { createMollieClient } from '@mollie/api-client'
import { randomUUID } from 'node:crypto'
import { products as demoProducts } from '~/data/products'

const SHIPPING_PRICES = {
  home: 6.9,
  pickup: 4.9
}

function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) throw createError({ statusCode: 503, statusMessage: 'La boutique est en cours de configuration.' })
  return { Authorization: `Bearer ${token}` }
}

function makeReference() {
  return `JLA-${new Date().toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`
}

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })

  const body = await readBody(event)
  const lines = Array.isArray(body?.items) ? body.items : []
  const customer = body?.customer || {}
  const delivery = body?.delivery || {}
  const requiredCustomerFields = ['firstName', 'lastName', 'email', 'phone', 'addressLine1', 'postalCode', 'city']
  if (!lines.length || requiredCustomerFields.some(field => !String(customer[field] || '').trim())) throw createError({ statusCode: 400, statusMessage: 'Veuillez compléter vos informations de livraison.' })
  if (!['home', 'pickup'].includes(delivery.method) || (delivery.method === 'pickup' && (!String(delivery.pickupPoint || '').trim() || !/^\d{6}$/.test(String(delivery.pickupPointId || ''))))) throw createError({ statusCode: 400, statusMessage: 'Veuillez sélectionner un point relais Mondial Relay.' })
  if (!body?.acceptedTerms) throw createError({ statusCode: 400, statusMessage: 'Vous devez accepter les conditions générales de vente.' })

  let catalog = demoProducts.map(product => ({ ...product, id: String(product.id), stock: 10 }))
  try {
    const response = await $fetch(`${config.public.strapiUrl.replace(/\/$/, '')}/api/products?fields[0]=name&fields[1]=price&fields[2]=stock&pagination[pageSize]=100`)
    if (response.data?.length) catalog = response.data.map(product => ({ id: String(product.documentId || product.id), name: product.name, price: Number(product.price), stock: Number(product.stock) }))
  } catch {}

  const items = lines.map(line => {
    const product = catalog.find(item => item.id === String(line.id))
    const quantity = Number(line.quantity)
    if (!product || !Number.isFinite(product.price) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw createError({ statusCode: 400, statusMessage: 'Votre panier contient un article invalide.' })
    if (!Number.isInteger(product.stock) || product.stock < quantity) throw createError({ statusCode: 409, statusMessage: `Le stock de « ${product.name} » vient d’être mis à jour. Veuillez actualiser votre panier.` })
    return { product, quantity }
  })
  const subtotalAmount = items.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const shippingAmount = SHIPPING_PRICES[delivery.method]
  const totalAmount = subtotalAmount + shippingAmount
  const strapiUrl = config.public.strapiUrl.replace(/\/$/, '')
  const reference = makeReference()

  const created = await $fetch(`${strapiUrl}/api/orders`, {
    method: 'POST',
    headers: strapiHeaders(),
    body: {
      data: {
        reference,
        firstName: customer.firstName.trim(), lastName: customer.lastName.trim(), email: customer.email.trim().toLowerCase(), phone: customer.phone.trim(),
        addressLine1: customer.addressLine1.trim(), addressLine2: String(customer.addressLine2 || '').trim() || null,
        postalCode: customer.postalCode.trim(), city: customer.city.trim(), country: 'France',
        deliveryMethod: delivery.method, pickupPoint: delivery.method === 'pickup' ? delivery.pickupPoint.trim() : null, pickupPointId: delivery.method === 'pickup' ? delivery.pickupPointId : null,
        items: items.map(({ product, quantity }) => ({ productDocumentId: product.id, productName: product.name, unitPrice: product.price, quantity })),
        subtotalAmount, shippingAmount, totalAmount, currency: 'EUR', paymentStatus: 'pending', fulfillmentStatus: 'pending'
      }
    }
  })
  const order = created.data
  const siteUrl = config.public.siteUrl.replace(/\/$/, '')
  const paymentData = {
    amount: { currency: 'EUR', value: totalAmount.toFixed(2) },
    description: `Maison JLA · ${reference}`,
    redirectUrl: `${siteUrl}/commande/merci?reference=${encodeURIComponent(reference)}`,
    metadata: { orderDocumentId: order.documentId }
  }
  if (!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) paymentData.webhookUrl = `${siteUrl}/api/mollie/webhook`

  const payment = await createMollieClient({ apiKey: config.mollieApiKey }).payments.create(paymentData)
  await $fetch(`${strapiUrl}/api/orders/${order.documentId}`, { method: 'PUT', headers: strapiHeaders(), body: { data: { molliePaymentId: payment.id } } })
  return { checkoutUrl: payment.getCheckoutUrl() }
})
