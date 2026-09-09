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
  const response = await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(documentId)}?fields[0]=molliePaymentId&fields[1]=paymentStatus&fields[2]=confirmationEmailSentAt&fields[3]=refundStatus`, {
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
      'fields[3]': 'refundStatus',
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
      'fields[3]': 'refundStatus',
      'pagination[pageSize]': 1
    }
  })
  return response.data?.[0] || null
}

export async function synchronizeOrderPayment(strapiUrl, order, payment) {
  if (!order || order.molliePaymentId !== payment.id) return { status: null, refundRequired: false }

  const status = mollieStatus(payment.status)
  if (status === 'paid') {
    const response = await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/confirm-paid-reservation`, {
      method: 'POST',
      headers: strapiHeaders(),
      body: { data: { paidAt: payment.paidAt || new Date().toISOString() } }
    })
    return { status, refundRequired: Boolean(response?.data?.refundRequired) }
  }

  if (order.paymentStatus !== status) {
    const data = { paymentStatus: status }
    await $fetch(`${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}`, {
      method: 'PUT',
      headers: strapiHeaders(),
      body: { data }
    })
  }

  return { status, refundRequired: false }
}
