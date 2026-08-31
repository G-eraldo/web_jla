import { createMollieClient } from '@mollie/api-client'
import { products as demoProducts } from '~/data/products'

export default defineEventHandler(async event => {
  const config = useRuntimeConfig()
  if (!config.mollieApiKey) throw createError({ statusCode: 503, statusMessage: 'Le paiement est en cours de configuration.' })
  const body = await readBody(event)
  const lines = Array.isArray(body?.items) ? body.items : []
  if (!lines.length || !body?.customer?.email || !body?.customer?.firstName || !body?.customer?.address) throw createError({ statusCode: 400, statusMessage: 'Veuillez compléter vos informations de livraison.' })
  let catalog = demoProducts.map(product => ({ ...product, id: String(product.id) }))
  try {
    const response = await $fetch(`${config.public.strapiUrl.replace(/\/$/, '')}/api/products?fields[0]=name&fields[1]=price&pagination[pageSize]=100`)
    if (response.data?.length) catalog = response.data.map(product => ({ id: String(product.documentId || product.id), name: product.name, price: Number(product.price) }))
  } catch {}
  const items = lines.map(line => { const product = catalog.find(item => item.id === String(line.id)); const quantity = Number(line.quantity); if (!product || !Number.isFinite(product.price) || !Number.isInteger(quantity) || quantity < 1 || quantity > 10) throw createError({ statusCode: 400, statusMessage: 'Votre panier contient un article invalide.' }); return { product, quantity } })
  const total = items.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  const siteUrl = config.public.siteUrl.replace(/\/$/, '')
  const paymentData = { amount: { currency: 'EUR', value: total.toFixed(2) }, description: `Maison JLA · JLA-${Date.now()}`, redirectUrl: `${siteUrl}/commande/merci` }
  if (!siteUrl.includes('localhost') && !siteUrl.includes('127.0.0.1')) paymentData.webhookUrl = `${siteUrl}/api/mollie/webhook`
  const payment = await createMollieClient({ apiKey: config.mollieApiKey }).payments.create(paymentData)
  return { checkoutUrl: payment.getCheckoutUrl() }
})
