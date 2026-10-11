import assert from 'node:assert/strict'
import test from 'node:test'
import { isOctobreRoseProduct, isRegularCatalogProduct } from '../app/lib/octobre-rose.js'

test('repère uniquement les bracelets dont le slug porte le préfixe Octobre Rose', () => {
  assert.equal(isOctobreRoseProduct({ categorySlug: 'bracelets', slug: 'octobre-rose-perles' }), true)
  assert.equal(isOctobreRoseProduct({ categorySlug: 'bracelets', slug: 'bracelet-rose' }), false)
  assert.equal(isOctobreRoseProduct({ categorySlug: 'colliers', slug: 'octobre-rose-perles' }), false)
  assert.equal(isOctobreRoseProduct({ categorySlug: 'bracelets', slug: 'octobre-rose' }), false)
})

test('écarte le bracelet Octobre Rose du catalogue standard', () => {
  assert.equal(isRegularCatalogProduct({ categorySlug: 'bracelets', slug: 'octobre-rose-bracelet' }), false)
  assert.equal(isRegularCatalogProduct({ categorySlug: 'bracelets', slug: 'bracelet-bora-bora-dore' }), true)
})
