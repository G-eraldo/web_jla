import assert from 'node:assert/strict'
import test from 'node:test'

import {
  amountUntilFreeShipping,
  qualifiesForFreeShipping,
  shippingAmountFor
} from '../app/lib/shipping.js'

test('applique les tarifs de livraison sous le seuil de 60 €', () => {
  assert.equal(shippingAmountFor('pickup', 59.99), 4.9)
  assert.equal(shippingAmountFor('home', 59.99), 6.9)
  assert.equal(qualifiesForFreeShipping(59.99), false)
  assert.equal(amountUntilFreeShipping(59.99), 0.01)
})

test('offre les deux modes de livraison dès 60 €', () => {
  assert.equal(shippingAmountFor('pickup', 60), 0)
  assert.equal(shippingAmountFor('home', 60), 0)
  assert.equal(shippingAmountFor('pickup', 60.01), 0)
  assert.equal(qualifiesForFreeShipping(60), true)
  assert.equal(amountUntilFreeShipping(60), 0)
})

test('refuse un mode de livraison inconnu', () => {
  assert.throws(() => shippingAmountFor('express', 30), /Mode de livraison inconnu/)
})
