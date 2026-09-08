const statuses = new Set(['pending', 'paid', 'failed', 'canceled', 'expired'])

export function mollieStatus(status) {
  return statuses.has(status) ? status : 'pending'
}

export function orderDocumentId(metadata) {
  if (metadata && typeof metadata === 'object') return metadata.orderDocumentId || null
  try {
    return JSON.parse(metadata || '{}').orderDocumentId || null
  } catch {
    return null
  }
}

export function webhookPaymentId(payload) {
  if (typeof payload?.id === 'string') return payload.id
  if (typeof payload !== 'string') return null
  return new URLSearchParams(payload).get('id')
}

export function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN
  if (!token) throw createError({ statusCode: 503, statusMessage: 'La boutique est en cours de configuration.' })
  return { Authorization: `Bearer ${token}` }
}

export async function findOrderByDocumentId(strapiUrl, documentId) {
  const response = await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(documentId)}?fields[0]=molliePaymentId&fields[1]=paymentStatus&fields[2]=confirmationEmailSentAt`, {
    headers: strapiHeaders()
  })
  return response.data
}

export async function findOrderByPaymentId(strapiUrl, paymentId) {
  const response = await $fetch(`${strapiUrl}/api/orders`, {
    headers: strapiHeaders(),
    query: {
      'filters[molliePaymentId][$eq]': paymentId,
      'fields[0]': 'molliePaymentId',
      'fields[1]': 'paymentStatus',
      'fields[2]': 'confirmationEmailSentAt',
      'pagination[pageSize]': 1
    }
  })
  return response.data?.[0] || null
}

export async function findOrderByReference(strapiUrl, reference) {
  const response = await $fetch(`${strapiUrl}/api/orders`, {
    headers: strapiHeaders(),
    query: {
      'filters[reference][$eq]': reference,
      'fields[0]': 'molliePaymentId',
      'fields[1]': 'paymentStatus',
      'fields[2]': 'confirmationEmailSentAt',
      'pagination[pageSize]': 1
    }
  })
  return response.data?.[0] || null
}

export async function synchronizeOrderPayment(strapiUrl, order, payment) {
  if (!order || order.molliePaymentId !== payment.id) return null

  const status = mollieStatus(payment.status)
  const needsConfirmationRetry = status === 'paid' && !order.confirmationEmailSentAt
  if (order.paymentStatus !== status || needsConfirmationRetry) {
    const data = { paymentStatus: status }
    if (status === 'paid') data.paidAt = payment.paidAt || new Date().toISOString()
    await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}`, {
      method: 'PUT',
      headers: strapiHeaders(),
      body: { data }
    })
  }

  return status
}
