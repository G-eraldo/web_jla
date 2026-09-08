export function isValidPickupSelection(delivery) {
  if (delivery.method !== 'pickup') return true

  return Boolean(
    String(delivery.pickupPoint || '').trim()
    && /^\d+$/.test(String(delivery.pickupPointId || ''))
  )
}
