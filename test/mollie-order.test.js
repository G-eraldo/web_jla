import assert from 'node:assert/strict'
import test from 'node:test'

process.env.STRAPI_API_TOKEN = 'test-token'

const { synchronizeOrderPayment, verifyOrderCustomerEmail } = await import('../server/utils/mollie-order.js')

test('releases the reservation when Mollie reports a canceled payment', async () => {
  const requests = []
  globalThis.$fetch = async (url, options = {}) => {
    requests.push({ url, options })
    return { data: {} }
  }

  const result = await synchronizeOrderPayment(
    'https://back.example.test',
    { documentId: 'order-1', molliePaymentId: 'tr_cancelled', paymentStatus: 'pending' },
    { id: 'tr_cancelled', status: 'canceled' }
  )

  assert.deepEqual(result, { status: 'canceled', refundRequired: false })
  assert.deepEqual(requests.map(request => request.url), [
    'https://back.example.test/api/orders/order-1/record-payment-outcome',
    'https://back.example.test/api/orders/order-1/release-reservation'
  ])
  assert.deepEqual(requests[0].options.body, { data: { paymentStatus: 'canceled' } })
  assert.equal(requests[1].options.method, 'POST')
})

test('does not release stock after a paid payment confirmation', async () => {
  const requests = []
  globalThis.$fetch = async (url, options = {}) => {
    requests.push({ url, options })
    return { data: { refundRequired: false } }
  }

  const result = await synchronizeOrderPayment(
    'https://back.example.test',
    { documentId: 'order-2', molliePaymentId: 'tr_paid', paymentStatus: 'pending' },
    { id: 'tr_paid', status: 'paid', paidAt: '2026-09-09T20:00:00.000Z' }
  )

  assert.deepEqual(result, { status: 'paid', refundRequired: false })
  assert.deepEqual(requests.map(request => request.url), [
    'https://back.example.test/api/orders/order-2/confirm-paid-reservation'
  ])
})

test('le rapprochement commande/adresse est demandé à Strapi', async () => {
  const requests = []
  globalThis.$fetch = async (url, options = {}) => {
    requests.push({ url, options })
    return { data: { match: true } }
  }

  assert.equal(
    await verifyOrderCustomerEmail('https://back.example.test/', 'JLA-20260928-ABCDEF01', 'cliente@exemple.fr'),
    true
  )
  assert.deepEqual(requests, [
    {
      url: 'https://back.example.test/api/orders/by-reference/JLA-20260928-ABCDEF01/verify-customer-email',
      options: {
        method: 'POST',
        headers: { Authorization: 'Bearer test-token' },
        body: { email: 'cliente@exemple.fr' }
      }
    }
  ])
})

test('une réponse sans correspondance ne donne pas d’autorisation', async () => {
  globalThis.$fetch = async () => ({ data: { match: false } })

  assert.equal(
    await verifyOrderCustomerEmail('https://back.example.test', 'JLA-20260928-ABCDEF01', 'attaquant@exemple.fr'),
    false
  )
})

test('une réponse inattendue ne donne pas d’autorisation', async () => {
  globalThis.$fetch = async () => ({})

  assert.equal(
    await verifyOrderCustomerEmail('https://back.example.test', 'JLA-20260928-ABCDEF01', 'cliente@exemple.fr'),
    false
  )
})

test('une erreur Strapi remonte à l’appelant, qui doit refuser l’envoi', async () => {
  globalThis.$fetch = async () => {
    throw Object.assign(new Error('Not Found'), { statusCode: 404 })
  }

  await assert.rejects(() =>
    verifyOrderCustomerEmail('https://back.example.test', 'JLA-20260928-ABCDEF01', 'cliente@exemple.fr')
  )
})
