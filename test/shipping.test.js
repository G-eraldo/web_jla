import assert from 'node:assert/strict'
import test from 'node:test'
import { amountUntilFreeShipping, qualifiesForFreeShipping, shippingAmountFor } from '../app/lib/shipping.js'

test('la livraison devient gratuite dès 80 € de produits', () => {
  assert.equal(qualifiesForFreeShipping(79.99), false)
  assert.equal(amountUntilFreeShipping(79.99), 0.01)
  assert.equal(shippingAmountFor('pickup', 79.99), 3.9)
  assert.equal(shippingAmountFor('home', 79.99), 7.9)
  assert.equal(qualifiesForFreeShipping(80), true)
  assert.equal(amountUntilFreeShipping(80), 0)
  assert.equal(shippingAmountFor('pickup', 80), 0)
  assert.equal(shippingAmountFor('home', 80), 0)
})
