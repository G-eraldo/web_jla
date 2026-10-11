export function isOctobreRoseProduct(product) {
  return product?.categorySlug === 'bracelets'
    && typeof product.slug === 'string'
    && product.slug.startsWith('octobre-rose-')
}

export function isRegularCatalogProduct(product) {
  return !isOctobreRoseProduct(product)
}
