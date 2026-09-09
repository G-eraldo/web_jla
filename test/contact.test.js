import assert from 'node:assert/strict'
import test from 'node:test'

import { buildContactEmail, validateContactPayload } from '../server/utils/contact.js'

const validPayload = {
  firstName: 'Jeanne',
  lastName: 'Martin',
  email: 'Jeanne@example.com',
  subject: 'Question sur un bracelet',
  orderReference: 'JLA-1234',
  message: 'Bonjour,\nLe bracelet est-il réglable ?',
  website: ''
}

test('valide et normalise les données du formulaire de contact', () => {
  const result = validateContactPayload(validPayload)

  assert.equal(result.error, undefined)
  assert.equal(result.data.email, 'jeanne@example.com')
  assert.equal(result.data.message, validPayload.message)
})

test('rejette les messages incomplets, trop longs ou contenant des champs inattendus', () => {
  assert.ok(validateContactPayload({ ...validPayload, message: '' }).error)
  assert.ok(validateContactPayload({ ...validPayload, subject: 'x'.repeat(121) }).error)
  assert.ok(validateContactPayload({ ...validPayload, subject: 'Question\nBcc: tiers@example.com' }).error)
  assert.ok(validateContactPayload({ ...validPayload, admin: true }).error)
})

test('prépare un e-mail Maison JLA sûr pour la bonne destinataire', () => {
  const { data } = validateContactPayload({
    ...validPayload,
    firstName: '<Jeanne>',
    message: '<script>alert(1)</script>\nMerci'
  })
  const email = buildContactEmail(data)

  assert.equal(email.to, 'maisonjla@outlook.com')
  assert.equal(email.replyTo, 'jeanne@example.com')
  assert.match(email.html, /background:#f5eee6/)
  assert.match(email.html, /font-family:Georgia,serif/)
  assert.doesNotMatch(email.html, /<script>/)
  assert.match(email.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/)
})
