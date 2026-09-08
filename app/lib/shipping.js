export const FREE_SHIPPING_THRESHOLD = 60

export const SHIPPING_PRICES = Object.freeze({
  home: 7.9,
  pickup: 3.9
})

const FREE_SHIPPING_THRESHOLD_CENTS = FREE_SHIPPING_THRESHOLD * 100

function toCents(value) {
  return Math.round(Number(value) * 100)
}

export function qualifiesForFreeShipping(subtotal) {
  const subtotalCents = toCents(subtotal)
  return Number.isFinite(subtotalCents) && subtotalCents >= FREE_SHIPPING_THRESHOLD_CENTS
}

export function shippingAmountFor(method, subtotal) {
  const price = SHIPPING_PRICES[method]
  if (price === undefined) throw new RangeError(`Mode de livraison inconnu : ${method}`)
  return qualifiesForFreeShipping(subtotal) ? 0 : price
}

export function amountUntilFreeShipping(subtotal) {
  const subtotalCents = toCents(subtotal)
  if (!Number.isFinite(subtotalCents) || subtotalCents < 0) return FREE_SHIPPING_THRESHOLD
  return Math.max(0, FREE_SHIPPING_THRESHOLD_CENTS - subtotalCents) / 100
}
