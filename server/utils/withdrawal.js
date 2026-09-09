import { createHash, randomUUID } from 'node:crypto'

const asString = (value, maxLength) => String(value || '').trim().slice(0, maxLength)

export function withdrawalFingerprint(declaration) {
  return createHash('sha256').update(JSON.stringify({
    firstName: declaration.firstName.toLowerCase(),
    lastName: declaration.lastName.toLowerCase(),
    email: declaration.email.toLowerCase(),
    orderReference: declaration.orderReference.toUpperCase(),
    products: declaration.products,
    orderedAt: declaration.orderedAt,
    receivedAt: declaration.receivedAt || null
  })).digest('hex')
}

export async function persistWithdrawal({ strapiUrl, token, declaration, declaredAt }) {
  if (!token) throw createError({ statusCode: 503, statusMessage: 'Le service de rétractation est temporairement indisponible. Écrivez à maisonjla@outlook.fr.' })
  const baseUrl = strapiUrl.replace(/\/$/, '')
  const fingerprint = withdrawalFingerprint(declaration)
  const headers = { Authorization: `Bearer ${token}` }
  const existing = await $fetch(`${baseUrl}/api/withdrawals`, {
    headers,
    query: { 'filters[fingerprint][$eq]': fingerprint, 'pagination[pageSize]': 1, 'fields[0]': 'reference' }
  })
  if (existing.data?.[0]) return { ...existing.data[0], duplicate: true }

  const reference = `RET-${declaredAt.toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8).toUpperCase()}`
  try {
    const created = await $fetch(`${baseUrl}/api/withdrawals`, {
      method: 'POST', headers,
      body: { data: { ...declaration, reference, fingerprint, declaredAt: declaredAt.toISOString(), emailStatus: 'pending' } }
    })
    return created.data
  } catch (error) {
    // A concurrent retry may have created the same declaration. Returning its
    // existing receipt makes the public action idempotent.
    const retry = await $fetch(`${baseUrl}/api/withdrawals`, {
      headers,
      query: { 'filters[fingerprint][$eq]': fingerprint, 'pagination[pageSize]': 1, 'fields[0]': 'reference' }
    })
    if (retry.data?.[0]) return { ...retry.data[0], duplicate: true }
    throw error
  }
}

export async function recordWithdrawalEmails({ strapiUrl, token, documentId, sellerSent, customerSent }) {
  const emailStatus = sellerSent && customerSent ? 'sent' : sellerSent || customerSent ? 'partially_sent' : 'failed'
  await $fetch(`${strapiUrl.replace(/\/$/, '')}/api/withdrawals/${encodeURIComponent(documentId)}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${token}` },
    body: { data: {
      emailStatus,
      ...(sellerSent ? { sellerEmailSentAt: new Date().toISOString() } : {}),
      ...(customerSent ? { customerReceiptSentAt: new Date().toISOString() } : {})
    } }
  })
}
