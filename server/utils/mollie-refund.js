import { strapiHeaders } from './mollie-order.js'

export async function requestAutomaticRefund(client, strapiUrl, order, payment) {
  const refundPath = `${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}`
  try {
    const refund = await client.paymentRefunds.create({
      paymentId: payment.id,
      amount: { currency: payment.amount.currency, value: payment.amount.value },
      description: `Remboursement automatique — ${order.documentId}`,
      metadata: { orderDocumentId: order.documentId },
      idempotencyKey: `maison-jla-stock-${order.documentId}`
    })
    await $fetch(`${refundPath}/record-refund`, {
      method: 'POST', headers: strapiHeaders(), body: { data: { refund: { id: refund.id, status: refund.status } } }
    })
    return refund
  } catch (error) {
    await $fetch(`${refundPath}/record-refund-failure`, {
      method: 'POST', headers: strapiHeaders()
    })
    throw error
  }
}
