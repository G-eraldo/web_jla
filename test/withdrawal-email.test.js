import assert from 'node:assert/strict'
import test from 'node:test'
import { withdrawalEmailHtml } from '../server/utils/withdrawal-email.js'

test('l’accusé de rétractation reprend le style Maison JLA et échappe les données client', () => {
  const html = withdrawalEmailHtml({
    title: 'Votre rétractation a bien été transmise',
    intro: 'Conservez cet accusé.',
    closing: 'Maison JLA vous indiquera les modalités de retour.',
    declaration: {
      firstName: '<Claire>', lastName: 'Dupont', email: 'claire@example.fr',
      orderReference: 'JLA-123', products: 'Collier', orderedAt: '2026-09-30',
      receivedAt: '', sentAt: '30 septembre 2026', reference: 'RET-123'
    }
  })

  assert.match(html, /font-family:Georgia,serif/)
  assert.match(html, /Maison JLA — Julia Touret EI/)
  assert.match(html, /&lt;Claire&gt;/)
  assert.doesNotMatch(html, /<Claire>/)
  assert.match(html, /RET-123/)
})
