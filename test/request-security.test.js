import assert from 'node:assert/strict'
import test from 'node:test'

const { consumeQuota, enforceSameOrigin, reserveQuotas } = await import('../server/utils/request-security.js')

function stubGlobals({ siteUrl }) {
  globalThis.useRuntimeConfig = () => ({ public: { siteUrl } })
  globalThis.getHeader = (event, name) => event.headers?.[name] || undefined
  globalThis.createError = (payload) =>
    Object.assign(new Error(payload.message), payload)
}

let quotaCounter = 0
const freshName = (prefix) => `${prefix}-${process.pid}-${quotaCounter++}`

test("l'absence d'URL de site fait échouer le contrôle d'origine (échec fermé)", () => {
  stubGlobals({ siteUrl: '' })

  assert.throws(
    () => enforceSameOrigin({ headers: { origin: 'https://maisonjla.fr' } }),
    (error) => error.statusCode === 403
  )
})

test("l'origine du site est acceptée", () => {
  stubGlobals({ siteUrl: 'https://maisonjla.fr' })

  assert.doesNotThrow(() =>
    enforceSameOrigin({ headers: { origin: 'https://maisonjla.fr' } })
  )
})

test('une origine tierce est refusée', () => {
  stubGlobals({ siteUrl: 'https://maisonjla.fr' })

  assert.throws(
    () => enforceSameOrigin({ headers: { origin: 'https://exemple-malveillant.fr' } }),
    (error) => error.statusCode === 403
  )
})

test('le référent du site est accepté en absence d’en-tête origine', () => {
  stubGlobals({ siteUrl: 'https://maisonjla.fr' })

  assert.doesNotThrow(() =>
    enforceSameOrigin({
      headers: { referer: 'https://maisonjla.fr/retractation' }
    })
  )
})

test('une requête sans origine ni référent est refusée', () => {
  stubGlobals({ siteUrl: 'https://maisonjla.fr' })

  assert.throws(
    () => enforceSameOrigin({ headers: {} }),
    (error) => error.statusCode === 403
  )
})

test('le quota par destinataire n’autorise qu’un envoi par fenêtre', () => {
  const name = freshName('retractation-recipient')
  const allowed = []

  for (let index = 0; index < 3; index += 1) {
    allowed.push(
      consumeQuota(name, 'Cliente@Exemple.fr', { limit: 1, windowMs: 60_000 })
    )
  }

  assert.deepEqual(allowed, [true, false, false])
})

test('le quota est indépendant par destinataire et par usage', () => {
  const name = freshName('quota')
  const other = freshName('quota')

  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 60_000 }), true)
  assert.equal(consumeQuota(name, 'b@exemple.fr', { limit: 1, windowMs: 60_000 }), true)
  assert.equal(consumeQuota(other, 'a@exemple.fr', { limit: 1, windowMs: 60_000 }), true)
  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 60_000 }), false)
})

test('un quota global plafonne le volume total', () => {
  const name = freshName('retractation-global')
  let allowed = 0

  for (let index = 0; index < 5; index += 1) {
    if (consumeQuota(name, 'all', { limit: 2, windowMs: 60_000 })) allowed += 1
  }

  assert.equal(allowed, 2)
})

test('la réservation groupée autorise quand les deux quotas sont disponibles', () => {
  const recipientQuota = freshName('retractation-recipient')
  const globalQuota = freshName('retractation-global')
  const entries = [
    { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
    { name: globalQuota, key: 'all', limit: 1, windowMs: 60_000 }
  ]

  assert.equal(reserveQuotas(entries), true)
  assert.equal(reserveQuotas(entries), false)
})

test('un refus du plafond global ne consomme pas le quota du destinataire', () => {
  const recipientQuota = freshName('retractation-recipient')
  const globalQuota = freshName('retractation-global')

  // Le plafond global est saturé par d'autres destinataires.
  assert.equal(reserveQuotas([{ name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }]), true)
  assert.equal(reserveQuotas([{ name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }]), true)
  assert.equal(
    reserveQuotas([
      { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }
    ]),
    false
  )

  // Le plafond global rouvert, l'envoi du destinataire est toujours intact.
  const reopenedGlobal = freshName('retractation-global')
  assert.equal(
    reserveQuotas([
      { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: reopenedGlobal, key: 'all', limit: 2, windowMs: 60_000 }
    ]),
    true
  )
})

test('un refus du quota destinataire ne consomme pas le plafond global', () => {
  const recipientQuota = freshName('retractation-recipient')
  const globalQuota = freshName('retractation-global')

  assert.equal(
    reserveQuotas([{ name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 }]),
    true
  )
  assert.equal(
    reserveQuotas([
      { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: globalQuota, key: 'all', limit: 1, windowMs: 60_000 }
    ]),
    false
  )

  // Le plafond global est intact : un autre destinataire passe encore.
  assert.equal(
    reserveQuotas([
      { name: recipientQuota, key: 'autre@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: globalQuota, key: 'all', limit: 1, windowMs: 60_000 }
    ]),
    true
  )
})

test('le quota se réinitialise après la fenêtre', async () => {
  const name = freshName('fenetre')

  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 20 }), true)
  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 20 }), false)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 20 }), true)
})
