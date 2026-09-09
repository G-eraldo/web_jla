const SENDCLOUD_SERVICE_POINTS_URL = 'https://panel.sendcloud.sc/api/v3/service-points'

export class SendcloudServicePointError extends Error {
  constructor(message, statusCode = 502) {
    super(message)
    this.name = 'SendcloudServicePointError'
    this.statusCode = statusCode
  }
}

function credentials(options = {}) {
  const publicKey = options.publicKey || process.env.SENDCLOUD_PUBLIC_KEY
  const secretKey = options.secretKey || process.env.SENDCLOUD_SECRET_KEY
  if (!publicKey || !secretKey) throw new SendcloudServicePointError('La recherche de points relais est en cours de configuration.', 503)

  return `Basic ${Buffer.from(`${publicKey}:${secretKey}`).toString('base64')}`
}

async function request(url, options = {}) {
  const fetchImpl = options.fetchImpl || fetch
  let response

  try {
    response = await fetchImpl(url, {
      method: options.method || 'GET',
      headers: { Authorization: credentials(options) },
      signal: options.signal || AbortSignal.timeout(8000)
    })
  } catch (error) {
    if (error instanceof SendcloudServicePointError) throw error
    throw new SendcloudServicePointError('La recherche Mondial Relay est indisponible. Réessayez dans un instant.')
  }

  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const statusCode = response.status === 404 ? 400 : response.status === 401 ? 503 : 502
    throw new SendcloudServicePointError(
      statusCode === 400
        ? 'Ce point relais n’est plus disponible. Veuillez en choisir un autre.'
        : 'La recherche Mondial Relay est indisponible. Réessayez dans un instant.',
      statusCode
    )
  }

  return body?.data
}

export function formatServicePoint(point) {
  const address = point.address || {}
  const street = [address.street, address.house_number].filter(Boolean).join(' ')

  return {
    id: String(point.id),
    name: point.name || 'Point Relais Mondial Relay',
    address: street ? [street] : [],
    postalCode: address.postal_code || '',
    city: address.city || '',
    distance: point.distance || null,
    label: [point.name, street, `${address.postal_code || ''} ${address.city || ''}`.trim()].filter(Boolean).join(', ')
  }
}

export async function findMondialRelayPoints(postalCode, options = {}) {
  const query = new URLSearchParams({
    country_code: 'FR',
    carrier_code: 'mondial_relay',
    address: postalCode,
    radius: '15000',
    limit: '20'
  })
  const data = await request(`${SENDCLOUD_SERVICE_POINTS_URL}?${query}`, options)

  return (data?.results || []).map(formatServicePoint)
}

export async function validateMondialRelayPoint(servicePointId, options = {}) {
  if (!/^\d+$/.test(String(servicePointId || ''))) {
    throw new SendcloudServicePointError('Ce point relais est invalide.', 400)
  }

  const encodedId = encodeURIComponent(servicePointId)
  const point = await request(`${SENDCLOUD_SERVICE_POINTS_URL}/${encodedId}`, options)
  if (point?.carrier?.code !== 'mondial_relay' || point?.address?.country_code !== 'FR' || point?.is_expired) {
    throw new SendcloudServicePointError('Ce point relais n’est plus disponible. Veuillez en choisir un autre.', 400)
  }

  const availability = await request(`${SENDCLOUD_SERVICE_POINTS_URL}/${encodedId}/check-availability`, { ...options, method: 'POST' })
  if (!availability?.is_available) {
    throw new SendcloudServicePointError('Ce point relais n’est plus disponible. Veuillez en choisir un autre.', 400)
  }

  return formatServicePoint(point)
}
