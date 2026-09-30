import assert from 'node:assert/strict'
import test from 'node:test'
import { createPinia, setActivePinia } from 'pinia'
import { useCartStore } from '../app/stores/useCartStore.js'

test('une réservation qui affiche un stock nul ne vide pas le panier au retour de Mollie', () => {
  setActivePinia(createPinia())
  const cart = useCartStore()
  cart.items = [{ id: 'product-1', quantity: 1 }]

  cart.hydrateFromCatalog([{ id: 'product-1', name: 'Collier', price: 25.9, stock: 0 }])

  assert.equal(cart.items.length, 1)
  assert.equal(cart.items[0].quantity, 1)
  assert.equal(cart.items[0].stock, 0)
})
