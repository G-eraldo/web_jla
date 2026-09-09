import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'

import { useCartStore } from '../app/stores/useCartStore.js'

test('applique une remise validée sans faire confiance au prix du panier', async () => {
  setActivePinia(createPinia())
  const cart = useCartStore()
  cart.items = [{ id: 'bracelet', name: 'Bracelet', price: 25, quantity: 2, stock: 5 }]
  globalThis.$fetch = async (url, options) => {
    assert.equal(url, '/api/promo-code')
    assert.deepEqual(options.body, { code: 'BIENVENUE10', subtotalAmount: 50 })
    return { code: 'BIENVENUE10', kind: 'percentage', value: 10, discountAmount: 5 }
  }

  assert.equal(await cart.applyPromoCode(' bienvenue10 '), true)
  assert.equal(cart.discountAmount, 5)
  assert.equal(cart.totalAfterDiscount, 45)
})

test('supprime aussi le code promo quand le panier est vidé', () => {
  setActivePinia(createPinia())
  const cart = useCartStore()
  cart.items = [{ id: 'bague', name: 'Bague', price: 30, quantity: 1, stock: 1 }]
  cart.promoCode = 'CADEAU'
  cart.promotion = { discountAmount: 5 }

  cart.clearCart()

  assert.equal(cart.promoCode, '')
  assert.equal(cart.promotion, null)
  assert.equal(cart.totalAfterDiscount, 0)
})
