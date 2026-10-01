import assert from 'node:assert/strict'
import test from 'node:test'
import { Readable } from 'node:stream'

const { consumeQuota, enforceSameOrigin, reserveQuotas, readLimitedJsonBody } = await import('../server/utils/request-security.js')

test('le corps chunked est interrompu dès le dépassement, sans lire la suite', async () => {
  stubGlobals({ siteUrl: 'https://maisonjla.fr' })
  globalThis.setResponseHeader = (event, name, value) => { event.responseHeaders[name] = value }
  let reads = 0
  const req = Readable.from((async function* () {
    reads++; yield Buffer.from('{"a":"')
    reads++; yield Buffer.alloc(32, 'a')
    for (let index = 0; index < 100; index++) {
      reads++; yield Buffer.alloc(100_000, 'a')
    }
  })(), { highWaterMark: 1 })
  const event = { headers: {}, node: { req }, responseHeaders: {} }
  await assert.rejects(readLimitedJsonBody(event, 16), error => error.statusCode === 413)
  assert.equal(event.responseHeaders.Connection, 'close')
  assert.ok(reads <= 3)
  assert.equal(req.destroyed, false, 'la réponse HTTP peut encore être envoyée')
  req.destroy()
})

test('un corps fragmenté valide est décodé et la taille est mesurée en octets', async () => {
  stubGlobals({ siteUrl: 'https://maisonjla.fr' })
  const raw = Buffer.from('{"nom":"été"}')
  const event = () => ({ headers: {}, responseHeaders: {}, node: { req: Readable.from([raw.subarray(0, 10), raw.subarray(10)]) } })
  assert.deepEqual(await readLimitedJsonBody(event(), raw.length), { nom: 'été' })
  await assert.rejects(readLimitedJsonBody(event(), raw.length - 1), error => error.statusCode === 413)
})

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

  const reservation = reserveQuotas(entries)
  assert.ok(reservation, 'la réservation groupée doit être accordée')
  assert.equal(typeof reservation.commit, 'function')
  assert.equal(typeof reservation.release, 'function')
  assert.equal(reserveQuotas(entries), null, 'une réservation non tranchée consomme déjà le quota')
})

test('un refus du plafond global ne consomme pas le quota du destinataire', () => {
  const recipientQuota = freshName('retractation-recipient')
  const globalQuota = freshName('retractation-global')

  // Le plafond global est saturé par d'autres destinataires.
  assert.ok(reserveQuotas([{ name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }]))
  assert.ok(reserveQuotas([{ name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }]))
  assert.equal(
    reserveQuotas([
      { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }
    ]),
    null
  )

  // Le plafond global rouvert, l'envoi du destinataire est toujours intact.
  const reopenedGlobal = freshName('retractation-global')
  assert.ok(
    reserveQuotas([
      { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: reopenedGlobal, key: 'all', limit: 2, windowMs: 60_000 }
    ])
  )
})

test('un refus du quota destinataire ne consomme pas le plafond global', () => {
  const recipientQuota = freshName('retractation-recipient')
  const globalQuota = freshName('retractation-global')

  assert.ok(
    reserveQuotas([{ name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 }])
  )
  assert.equal(
    reserveQuotas([
      { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: globalQuota, key: 'all', limit: 1, windowMs: 60_000 }
    ]),
    null
  )

  // Le plafond global est intact : un autre destinataire passe encore.
  assert.ok(
    reserveQuotas([
      { name: recipientQuota, key: 'autre@exemple.fr', limit: 1, windowMs: 60_000 },
      { name: globalQuota, key: 'all', limit: 1, windowMs: 60_000 }
    ])
  )
})

test('une réservation libérée rend les quotas : un nouvel essai peut partir', () => {
  const recipientQuota = freshName('retractation-recipient')
  const globalQuota = freshName('retractation-global')
  const entries = [
    { name: recipientQuota, key: 'cliente@exemple.fr', limit: 1, windowMs: 60_000 },
    { name: globalQuota, key: 'all', limit: 2, windowMs: 60_000 }
  ]

  const failed = reserveQuotas(entries)
  assert.equal(failed.release(), true)
  assert.equal(failed.release(), false, 'une réservation déjà libérée ne rend rien de plus')

  // L'envoi n'a pas eu lieu : la nouvelle tentative doit être autorisée.
  const retried = reserveQuotas(entries)
  assert.ok(retried, 'le quota libéré doit pouvoir être réservé à nouveau')
  retried.commit()
  assert.equal(retried.release(), false, 'un envoi accepté ne peut plus rendre son quota')

  // Le quota est désormais consommé par l'envoi accepté.
  assert.equal(reserveQuotas(entries), null)
})

test('le quota se réinitialise après la fenêtre', async () => {
  const name = freshName('fenetre')

  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 20 }), true)
  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 20 }), false)
  await new Promise((resolve) => setTimeout(resolve, 30))
  assert.equal(consumeQuota(name, 'a@exemple.fr', { limit: 1, windowMs: 20 }), true)
})
