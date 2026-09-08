import assert from 'node:assert/strict'
import test from 'node:test'

import { mollieStatus, orderDocumentId, synchronizeOrderPayment, webhookPaymentId } from '../server/utils/mollie-order.js'

test('lit les payloads webhook JSON et form-urlencoded de Mollie', () => {
  assert.equal(webhookPaymentId({ id: 'tr_json' }), 'tr_json')
  assert.equal(webhookPaymentId('id=tr_form'), 'tr_form')
  assert.equal(webhookPaymentId(''), null)
})

test('lit le documentId depuis les deux formats de metadata Mollie', () => {
  assert.equal(orderDocumentId({ orderDocumentId: 'order-1' }), 'order-1')
  assert.equal(orderDocumentId('{"orderDocumentId":"order-2"}'), 'order-2')
  assert.equal(orderDocumentId('invalid'), null)
})

test('normalise les statuts Mollie non gérés sans valider le paiement', () => {
  assert.equal(mollieStatus('paid'), 'paid')
  assert.equal(mollieStatus('open'), 'pending')
})

test('synchronise une commande payée et renseigne paidAt', async () => {
  const previousToken = process.env.STRAPI_API_TOKEN
  const previousFetch = globalThis.$fetch
  const calls = []
  process.env.STRAPI_API_TOKEN = 'test-token'
  globalThis.$fetch = async (url, options) => calls.push({ url, options })

  try {
    const status = await synchronizeOrderPayment(
      'https://cms.example.test',
      { documentId: 'order-1', molliePaymentId: 'tr_1', paymentStatus: 'pending', confirmationEmailSentAt: null },
      { id: 'tr_1', status: 'paid', paidAt: '2026-09-08T12:03:00Z' }
    )

    assert.equal(status, 'paid')
    assert.equal(calls.length, 1)
    assert.deepEqual(calls[0].options.body, { data: { paymentStatus: 'paid', paidAt: '2026-09-08T12:03:00Z' } })
  } finally {
    globalThis.$fetch = previousFetch
    if (previousToken === undefined) delete process.env.STRAPI_API_TOKEN
    else process.env.STRAPI_API_TOKEN = previousToken
  }
})

test('ne réécrit pas une commande déjà traitée', async () => {
  const previousFetch = globalThis.$fetch
  globalThis.$fetch = async () => assert.fail('aucun appel Strapi attendu')

  try {
    const status = await synchronizeOrderPayment(
      'https://cms.example.test',
      { documentId: 'order-1', molliePaymentId: 'tr_1', paymentStatus: 'paid', confirmationEmailSentAt: '2026-09-08T12:04:00Z' },
      { id: 'tr_1', status: 'paid', paidAt: '2026-09-08T12:03:00Z' }
    )
    assert.equal(status, 'paid')
  } finally {
    globalThis.$fetch = previousFetch
  }
})
