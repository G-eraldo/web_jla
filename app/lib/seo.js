export const COLLECTION_SEO = {
  'tous-les-bijoux': {
    title: 'Tous les bijoux',
    description: 'Découvrez les colliers, bracelets, bagues et boucles d’oreilles Maison JLA en acier inoxydable, avec les détails et les prix de chaque modèle.',
    intro: 'Parcourez les bijoux fantaisie actuellement proposés par Maison JLA. Chaque fiche précise la composition, le prix, les dimensions disponibles et le stock du modèle.'
  },
  colliers: {
    title: 'Colliers',
    description: 'Colliers Maison JLA en acier inoxydable, dorés ou argentés. Comparez les pendentifs, les longueurs et les prix des modèles disponibles.',
    intro: 'Les colliers Maison JLA existent en acier inoxydable doré ou argenté, avec des chaînes et des pendentifs différents selon les modèles. Consultez chaque fiche pour choisir la longueur et les détails qui vous conviennent.'
  },
  boucles: {
    title: 'Boucles d’oreilles',
    description: 'Boucles d’oreilles Maison JLA en acier inoxydable, en teintes dorées et argentées. Découvrez les détails et le prix de chaque paire.',
    intro: 'Explorez les boucles d’oreilles Maison JLA en acier inoxydable. Les fiches présentent la finition, la composition, le prix et la disponibilité de chaque paire.'
  },
  bracelets: {
    title: 'Bracelets',
    description: 'Bracelets Maison JLA en acier inoxydable, dorés ou argentés. Consultez les tailles de chaîne, les détails et les prix.',
    intro: 'Découvrez les bracelets Maison JLA en acier inoxydable. Plusieurs modèles ont une chaîne de 15 à 20 cm ; vérifiez les dimensions et les détails sur chaque fiche produit.'
  },
  bagues: {
    title: 'Bagues',
    description: 'Bagues réglables Maison JLA en acier inoxydable doré. Comparez les modèles, les détails visibles et les prix.',
    intro: 'Les bagues Maison JLA actuellement proposées sont réglables et en acier inoxydable doré. Consultez leur fiche pour voir chaque modèle, son prix et sa disponibilité.'
  }
}

export const COLLECTION_SLUGS = Object.keys(COLLECTION_SEO)

export function collectionSeo(slug) {
  return COLLECTION_SEO[slug] || null
}

export function collectionPage(value) {
  if (value === undefined) return 1
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null
  const page = Number(value)
  return Number.isSafeInteger(page) ? page : null
}

export function productSeoDescription(product) {
  if (!product) return 'Découvrez les bijoux fantaisie Maison JLA.'
  const name = String(product.name || 'Bijou Maison JLA').trim()
  const description = String(product.description || '').replace(/\s+/g, ' ').trim()
  const price = Number.isFinite(product.price)
    ? `${new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(product.price)}. `
    : ''
  const prefix = `${name} — `
  const suffix = ` ${price}Livraison en France métropolitaine.`
  const available = Math.max(0, 160 - prefix.length - suffix.length)
  const detail = description.length > available
    ? `${description.slice(0, Math.max(0, available - 1)).trimEnd()}…`
    : description
  return `${prefix}${detail}${suffix}`.slice(0, 160)
}
