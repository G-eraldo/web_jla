import { randomUUID } from 'node:crypto'
import { Resend } from 'resend'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const clean = (value, maxLength) => String(value || '').trim().slice(0, maxLength)
const escapeHtml = value => clean(value, 2000).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character])

export default defineEventHandler(async event => {
  const body = await readBody(event)
  if (body?.website) return { reference: 'Demande reçue', sentAt: new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Europe/Paris' }).format(new Date()) }

  const declaration = {
    firstName: clean(body?.firstName, 100),
    lastName: clean(body?.lastName, 100),
    email: clean(body?.email, 254).toLowerCase(),
    orderReference: clean(body?.orderReference, 100),
    products: clean(body?.products, 2000),
    orderedAt: clean(body?.orderedAt, 10),
    receivedAt: clean(body?.receivedAt, 10)
  }
  if (!declaration.firstName || !declaration.lastName || !emailPattern.test(declaration.email) || !declaration.orderReference || !declaration.products || !/^\d{4}-\d{2}-\d{2}$/.test(declaration.orderedAt)) {
    throw createError({ statusCode: 400, statusMessage: 'Veuillez compléter les informations nécessaires à l’identification de la commande.' })
  }

  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM
  const sellerEmail = process.env.RETRACTATION_TO || 'maisonjla@outlook.com'
  if (!apiKey || !from) throw createError({ statusCode: 503, statusMessage: 'L’envoi est temporairement indisponible. Écrivez à maisonjla@outlook.com.' })

  const sentAtDate = new Date()
  const sentAt = new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long', timeStyle: 'long', timeZone: 'Europe/Paris' }).format(sentAtDate)
  const reference = `RET-${sentAtDate.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`
  const plainDeclaration = `Nom : ${declaration.firstName} ${declaration.lastName}\nE-mail : ${declaration.email}\nCommande : ${declaration.orderReference}\nProduits : ${declaration.products}\nDate de commande : ${declaration.orderedAt}\nDate de réception : ${declaration.receivedAt || 'non renseignée'}\nDéclaration envoyée le : ${sentAt}\nRéférence : ${reference}`
  const htmlDeclaration = `<dl><dt><strong>Nom</strong></dt><dd>${escapeHtml(declaration.firstName)} ${escapeHtml(declaration.lastName)}</dd><dt><strong>E-mail</strong></dt><dd>${escapeHtml(declaration.email)}</dd><dt><strong>Commande</strong></dt><dd>${escapeHtml(declaration.orderReference)}</dd><dt><strong>Produits</strong></dt><dd>${escapeHtml(declaration.products).replaceAll('\n', '<br>')}</dd><dt><strong>Date de commande</strong></dt><dd>${escapeHtml(declaration.orderedAt)}</dd><dt><strong>Date de réception</strong></dt><dd>${escapeHtml(declaration.receivedAt || 'non renseignée')}</dd><dt><strong>Envoi</strong></dt><dd>${escapeHtml(sentAt)}</dd><dt><strong>Référence</strong></dt><dd>${reference}</dd></dl>`
  const resend = new Resend(apiKey)

  try {
    await Promise.all([
      resend.emails.send({ from, to: sellerEmail, replyTo: declaration.email, subject: `Rétractation ${declaration.orderReference} — ${reference}`, text: `Une déclaration de rétractation a été reçue.\n\n${plainDeclaration}`, html: `<h1>Déclaration de rétractation reçue</h1>${htmlDeclaration}` }),
      resend.emails.send({ from, to: declaration.email, replyTo: sellerEmail, subject: `Accusé de réception de votre rétractation — Maison JLA`, text: `Votre déclaration de rétractation a été transmise à Maison JLA.\n\n${plainDeclaration}\n\nConservez cet e-mail. Maison JLA vous indiquera les modalités de retour.`, html: `<h1>Votre rétractation a bien été transmise</h1><p>Conservez cet accusé de réception sur support durable.</p>${htmlDeclaration}<p>Maison JLA vous indiquera les modalités de retour.</p>` })
    ])
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'L’accusé de réception n’a pas pu être envoyé. Écrivez à maisonjla@outlook.com.' })
  }

  return { reference, sentAt }
})
