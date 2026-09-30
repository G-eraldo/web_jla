import assert from 'node:assert/strict'
import test from 'node:test'
import { collectionPage, collectionSeo, COLLECTION_SLUGS, productSeoDescription } from '../app/lib/seo.js'
import { fetchAllStrapiPages } from '../app/lib/strapi-pagination.js'

test('chaque collection publique a un titre et une description distincts', () => {
  assert.deepEqual(COLLECTION_SLUGS, ['tous-les-bijoux', 'colliers', 'boucles', 'bracelets', 'bagues'])
  const descriptions = new Set(COLLECTION_SLUGS.map(slug => collectionSeo(slug).description))
  assert.equal(descriptions.size, COLLECTION_SLUGS.length)
  assert.equal(collectionSeo('inconnu'), null)
})

test('chaque collection possède un texte visible dédié', () => {
  const intros = COLLECTION_SLUGS.map(slug => collectionSeo(slug).intro)
  assert.ok(intros.every(Boolean))
  assert.equal(new Set(intros).size, COLLECTION_SLUGS.length)
})

test('la pagination Strapi récupère les produits au-delà de la première page', async () => {
  const calls = []
  const products = await fetchAllStrapiPages(async ({ page, pageSize }) => {
    calls.push({ page, pageSize })
    return {
      data: Array.from({ length: page === 3 ? 5 : 100 }, (_, index) => ({ id: (page - 1) * 100 + index + 1 })),
      meta: { pagination: { pageCount: 3 } }
    }
  })

  assert.deepEqual(calls, [
    { page: 1, pageSize: 100 },
    { page: 2, pageSize: 100 },
    { page: 3, pageSize: 100 }
  ])
  assert.equal(products.length, 205)
  assert.equal(products.at(-1).id, 205)
})

test('les URL de pagination acceptent seulement des pages entières positives', () => {
  assert.equal(collectionPage(undefined), 1)
  assert.equal(collectionPage('2'), 2)
  for (const value of ['0', '-1', '2.5', '2abc', '01', '', ['1', '2'], '9007199254740992']) {
    assert.equal(collectionPage(value), null)
  }
})

test('les modèles de même prix et composition gardent des descriptions distinctes', () => {
  const common = { price: 10, description: 'Bague réglable en acier inoxydable couleur or.' }
  const evora = productSeoDescription({ ...common, name: 'Bague Evora Dorée ' })
  const siena = productSeoDescription({ ...common, name: 'Bague Siena Dorée ' })
  assert.notEqual(evora, siena)
  assert.ok(evora.startsWith('Bague Evora Dorée — '))
  assert.ok(evora.includes('acier inoxydable'))
  assert.ok(evora.includes('10,00'))
  assert.ok(productSeoDescription({ ...common, name: 'Bague Evora', description: 'Description '.repeat(40) }).length <= 160)
})
