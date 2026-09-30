import { createHash } from 'node:crypto'

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

export async function persistWithdrawal({ strapiUrl, token, declaration }) {
  if (!token) throw createError({ statusCode: 503, message: 'Le service de rétractation est temporairement indisponible. Écrivez à contact@maisonjla.fr.' })
  const baseUrl = strapiUrl.replace(/\/$/, '')
  const fingerprint = withdrawalFingerprint(declaration)
  const headers = { Authorization: `Bearer ${token}` }
  const existing = await $fetch(`${baseUrl}/api/withdrawals/find-duplicate`, {
    method: 'POST', headers,
    body: { data: { fingerprint } }
  })
  if (existing.data) return existing.data

  try {
    const created = await $fetch(`${baseUrl}/api/withdrawals/submit`, {
      method: 'POST', headers,
      body: { data: declaration }
    })
    return created.data
  } catch (error) {
    // A concurrent retry may have created the same declaration. Returning its
    // existing receipt makes the public action idempotent.
    const retry = await $fetch(`${baseUrl}/api/withdrawals/find-duplicate`, {
      method: 'POST', headers,
      body: { data: { fingerprint } }
    })
    if (retry.data) return retry.data
    throw error
  }
}

export async function recordWithdrawalEmails({ strapiUrl, token, documentId, sellerSent, customerSent }) {
  await $fetch(`${strapiUrl.replace(/\/$/, '')}/api/withdrawals/${encodeURIComponent(documentId)}/record-email-status`, {
    method: 'POST', headers: { Authorization: `Bearer ${token}` },
    body: { data: { sellerSent, customerSent } }
  })
}
