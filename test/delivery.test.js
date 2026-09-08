import assert from 'node:assert/strict'
import test from 'node:test'

import { isValidPickupSelection } from '../server/utils/delivery.js'

test('accepte les identifiants numériques Sendcloud de longueur variable', () => {
  assert.equal(isValidPickupSelection({ method: 'pickup', pickupPoint: 'Relais Paris', pickupPointId: '123456' }), true)
  assert.equal(isValidPickupSelection({ method: 'pickup', pickupPoint: 'Relais Paris', pickupPointId: '10168633' }), true)
})

test('refuse un point relais incomplet ou non numérique', () => {
  assert.equal(isValidPickupSelection({ method: 'pickup', pickupPoint: '', pickupPointId: '10168633' }), false)
  assert.equal(isValidPickupSelection({ method: 'pickup', pickupPoint: 'Relais Paris', pickupPointId: 'MR-123' }), false)
})

test('la livraison à domicile ne demande pas de point relais', () => {
  assert.equal(isValidPickupSelection({ method: 'home' }), true)
})
