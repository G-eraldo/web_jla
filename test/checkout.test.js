import assert from 'node:assert/strict'
import test from 'node:test'
import { aggregateCartLines, checkoutFingerprint, makeOrderReference, ORDER_REFERENCE_PATTERN, validateCheckoutPayload } from '../server/utils/checkout.js'
import { sendResendEmail } from '../server/utils/request-security.js'

test('rejects oversized carts and unexpected checkout fields', () => {
  assert.deepEqual(aggregateCartLines(Array.from({ length: 21 }, (_, index) => ({ id: `p${index}`, quantity: 1 }))), [])
  assert.equal(validateCheckoutPayload({ acceptedTerms: true, items: [{ id: 'a', quantity: 1 }], extra: true }).error, 'La demande de commande est invalide.')
  assert.match(makeOrderReference(), ORDER_REFERENCE_PATTERN)
  assert.match('JLA-20260911-ABCDEF12', ORDER_REFERENCE_PATTERN)
})

test('creates a stable checkout fingerprint for retries', () => {
  const payload = {
    customer: { email: 'A@MaisonJLA.fr' },
    delivery: { method: 'home', pickupPointId: null },
    items: [{ id: 'abc', quantity: 1 }],
    promoCode: 'welcome'
  }
  assert.equal(checkoutFingerprint(payload), checkoutFingerprint({
    ...payload,
    customer: { email: ' a@maisonjla.fr ' }
  }))
})

test('treats a Resend error payload as a failed send', async () => {
  await assert.rejects(
    () => sendResendEmail({ emails: { send: async () => ({ data: null, error: { message: 'blocked' } }) } }, {}),
    /échoué|blocked/
  )
})
