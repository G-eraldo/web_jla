import assert from 'node:assert/strict'
import test from 'node:test'

import {
  findMondialRelayPoints,
  validateMondialRelayPoint
} from '../server/utils/sendcloud-service-points.js'

const point = {
  id: 10168633,
  name: 'Maison de la Presse',
  carrier: { code: 'mondial_relay', name: 'Mondial Relay' },
  address: {
    street: 'Rue de Paris',
    house_number: '12',
    postal_code: '75001',
    city: 'Paris',
    country_code: 'FR'
  },
  is_expired: false,
  distance: 450
}

function response(data, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => data
  }
}

const credentials = { publicKey: 'public', secretKey: 'secret' }

test('utilise et normalise la réponse Service Points API v3', async () => {
  let requestedUrl
  const points = await findMondialRelayPoints('75001', {
    ...credentials,
    fetchImpl: async (url) => {
      requestedUrl = url
      return response({ data: { results: [point] } })
    }
  })

  assert.match(requestedUrl, /\/api\/v3\/service-points/)
  assert.match(requestedUrl, /carrier_code=mondial_relay/)
  assert.deepEqual(points[0], {
    id: '10168633',
    name: 'Maison de la Presse',
    address: ['Rue de Paris 12'],
    postalCode: '75001',
    city: 'Paris',
    distance: 450,
    label: 'Maison de la Presse, Rue de Paris 12, 75001 Paris'
  })
})

test('revalide le transporteur et la disponibilité avant paiement', async () => {
  const methods = []
  const fetchImpl = async (_url, options) => {
    methods.push(options.method)
    return methods.length === 1
      ? response({ data: point })
      : response({ data: { is_available: true } })
  }

  const selected = await validateMondialRelayPoint('10168633', { ...credentials, fetchImpl })

  assert.equal(selected.id, '10168633')
  assert.deepEqual(methods, ['GET', 'POST'])
})

test('refuse un identifiant qui ne correspond pas à Mondial Relay', async () => {
  await assert.rejects(
    validateMondialRelayPoint('10168633', {
      ...credentials,
      fetchImpl: async () => response({ data: { ...point, carrier: { code: 'colissimo' } } })
    }),
    error => error.statusCode === 400
  )
})
