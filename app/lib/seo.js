export const COLLECTION_SEO = {
  'tous-les-bijoux': {
    title: 'Tous les bijoux',
    description: 'Colliers, bracelets, bagues et boucles d’oreilles Maison JLA. Découvrez les bijoux disponibles dans la collection.',
    intro: 'Parcourez les colliers, bracelets, bagues et boucles d’oreilles actuellement proposés par Maison JLA.'
  },
  colliers: {
    title: 'Colliers',
    description: 'Colliers Maison JLA. Découvrez les modèles actuellement disponibles dans cette collection.',
    intro: 'Découvrez les colliers Maison JLA et choisissez le modèle qui vous accompagne au quotidien ou lors d’une occasion particulière.'
  },
  boucles: {
    title: 'Boucles d’oreilles',
    description: 'Boucles d’oreilles Maison JLA. Parcourez les modèles disponibles dans cette collection.',
    intro: 'Parcourez les boucles d’oreilles Maison JLA, pensées pour compléter une tenue avec simplicité.'
  },
  bracelets: {
    title: 'Bracelets',
    description: 'Bracelets Maison JLA. Découvrez les modèles disponibles dans cette collection.',
    intro: 'Découvrez les bracelets Maison JLA et parcourez les modèles actuellement proposés.'
  },
  bagues: {
    title: 'Bagues',
    description: 'Bagues Maison JLA. Parcourez les modèles disponibles dans cette collection.',
    intro: 'Parcourez les bagues Maison JLA et choisissez parmi les modèles actuellement disponibles.'
  }
}

export const COLLECTION_SLUGS = Object.keys(COLLECTION_SEO)

export function collectionSeo(slug) {
  return COLLECTION_SEO[slug] || null
}
