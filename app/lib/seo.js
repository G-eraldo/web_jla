export const COLLECTION_SEO = {
  'tous-les-bijoux': {
    title: 'Tous les bijoux',
    description: 'Colliers, bracelets, bagues et boucles d’oreilles Maison JLA. Bijoux fantaisie à porter au quotidien, à choisir pour soi ou à offrir.'
  },
  colliers: {
    title: 'Colliers',
    description: 'Colliers Maison JLA en acier inoxydable. Des pièces fantaisie à porter près du cœur, livrées en France métropolitaine.'
  },
  boucles: {
    title: 'Boucles d’oreilles',
    description: 'Boucles d’oreilles Maison JLA. Une touche d’éclat pour le quotidien, à offrir ou à s’offrir.'
  },
  bracelets: {
    title: 'Bracelets',
    description: 'Bracelets Maison JLA. Des bijoux fantaisie à porter au fil des gestes, livrés à domicile ou en point relais.'
  },
  bagues: {
    title: 'Bagues',
    description: 'Bagues Maison JLA. Le détail qui change une tenue, en bijoux fantaisie pensés pour le quotidien.'
  }
}

export const COLLECTION_SLUGS = Object.keys(COLLECTION_SEO)

export function collectionSeo(slug) {
  return COLLECTION_SEO[slug] || null
}
