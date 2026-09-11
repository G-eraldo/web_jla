import assert from 'node:assert/strict'
import test from 'node:test'
import { collectionSeo, COLLECTION_SLUGS } from '../app/lib/seo.js'

test('chaque collection publique a un titre et une description distincts', () => {
  assert.deepEqual(COLLECTION_SLUGS, ['tous-les-bijoux', 'colliers', 'boucles', 'bracelets', 'bagues'])
  const descriptions = new Set(COLLECTION_SLUGS.map(slug => collectionSeo(slug).description))
  assert.equal(descriptions.size, COLLECTION_SLUGS.length)
  assert.equal(collectionSeo('inconnu'), null)
})
