import assert from 'node:assert/strict'
import test from 'node:test'

import { aggregateCartLines } from '../server/utils/checkout.js'

test('regroupe les lignes d’un même bijou avant la réservation', () => {
  assert.deepEqual(aggregateCartLines([
    { id: 'bracelet-1', quantity: 6 },
    { id: 'bracelet-1', quantity: 4 },
    { id: 'bague-1', quantity: 1 }
  ]), [
    { id: 'bague-1', quantity: 1 },
    { id: 'bracelet-1', quantity: 10 }
  ])
})

test('rejette une ligne invalide au lieu de réserver un stock ambigu', () => {
  assert.deepEqual(aggregateCartLines([{ id: 'bracelet-1', quantity: 1.5 }]), [])
})
