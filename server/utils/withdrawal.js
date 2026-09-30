export async function persistWithdrawal({ strapiUrl, token, declaration }) {
  if (!token) throw createError({ statusCode: 503, message: 'Le service de rétractation est temporairement indisponible. Écrivez à contact@maisonjla.fr.' })
  const baseUrl = strapiUrl.replace(/\/$/, '')
  const headers = { Authorization: `Bearer ${token}` }
  try {
    const created = await $fetch(`${baseUrl}/api/withdrawals/submit`, {
      method: 'POST', headers,
      body: { data: declaration }
    })
    return created.data
  } catch (error) {
    // Resubmitting the same declaration is idempotent: Strapi hashes the
    // normalized fields and returns the existing receipt if the first request
    // committed before its response was lost.
    const retry = await $fetch(`${baseUrl}/api/withdrawals/submit`, {
      method: 'POST', headers,
      body: { data: declaration }
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
