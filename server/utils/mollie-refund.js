import { strapiHeaders } from './mollie-order.js'

export async function requestAutomaticRefund(client, strapiUrl, order, payment) {
  const refundPath = `${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}`
  const claim = await $fetch(`${refundPath}/claim-refund`, {
    method: 'POST', headers: strapiHeaders()
  })
  if (!claim?.data?.claimed) return null
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
    // The PSP response may have been lost after accepting the refund. Leave the
    // durable processing claim for reconciliation instead of issuing it again.
    throw error
  }
}
