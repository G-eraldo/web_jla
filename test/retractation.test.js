import assert from 'node:assert/strict'
import test from 'node:test'

const SITE_URL = 'https://maisonjla.test'
const STRAPI_URL = 'https://back.example.test'
const SELLER_EMAIL = 'vendeur@maisonjla.test'

// La route s'appuie sur les globals Nitro/Nuxt : ils sont posés avant son
// import, qui appelle `defineEventHandler` au chargement du module.
globalThis.defineEventHandler = (handler) => handler
globalThis.createError = (payload) => Object.assign(new Error(payload.message), payload)
globalThis.getHeader = (event, name) => event.headers?.[name]
globalThis.getRequestIP = (event) => event.headers?.['x-real-ip'] || null
globalThis.setResponseHeader = (event, name, value) => {
  event.responseHeaders = { ...(event.responseHeaders || {}), [name]: value }
}
globalThis.useRuntimeConfig = () => ({
  public: { siteUrl: SITE_URL, strapiUrl: STRAPI_URL }
})
globalThis.readRawBody = async (event) => event.rawBody

// Le SDK Resend journalise ses erreurs hors production : inutile ici.
process.env.NODE_ENV = 'production'
process.env.RESEND_API_KEY = 'cle-de-test-factice'
process.env.RESEND_FROM = 'Maison JLA <contact@maisonjla.test>'
process.env.RETRACTATION_TO = SELLER_EMAIL
process.env.STRAPI_API_TOKEN = 'jeton-de-test-factice'

// `$fetch` comme le SDK Resend sérialisent le corps en JSON avant l'appel :
// selon le client, il arrive sous forme de chaîne ou déjà sous forme d'objet.
const bodyOf = (options) =>
  typeof options.body === 'string' ? JSON.parse(options.body) : options.body

/**
 * Faux Strapi : la vérification commande/adresse, l'enregistrement de la
 * déclaration (idempotent par empreinte) et la trace des envois. Aucun appel
 * réseau n'est fait.
 */
function fakeStrapi({ match = true, verifyError = false } = {}) {
  const state = { record: null, created: 0, emailStatus: [], verifyCalls: [] }

  globalThis.$fetch = async (url, options = {}) => {
    const target = String(url)
    if (target.includes('/verify-customer-email')) {
      state.verifyCalls.push({ target, body: options.body })
      if (verifyError)
        throw Object.assign(new Error('Indisponible'), { statusCode: 503 })
      return { data: { match } }
    }
    if (target.endsWith('/api/withdrawals/find-duplicate')) {
      const reference = state.record?.reference
      return reference
        ? { data: { documentId: 'wd-1', reference, duplicate: true } }
        : { data: null }
    }
    if (target.endsWith('/api/withdrawals/submit')) {
        state.created += 1
        state.record = bodyOf(options).data
        state.record.reference = `RET-20260930-${state.created}`
        return { data: { documentId: 'wd-1', reference: state.record.reference } }
    }
    if (target.includes('/api/withdrawals/') && target.endsWith('/record-email-status')) {
        const { sellerSent, customerSent } = bodyOf(options).data
        state.emailStatus.push({
          emailStatus: sellerSent && customerSent ? 'sent' : sellerSent || customerSent ? 'partially_sent' : 'failed',
          ...(sellerSent ? { sellerEmailSentAt: true } : {}),
          ...(customerSent ? { customerReceiptSentAt: true } : {})
        })
        return null
    }
    throw new Error(`Appel Strapi inattendu : ${target}`)
  }

  return state
}

/**
 * Faux Resend : le SDK réel poste sur son API par le `fetch` global. Le
 * remplacer exerce donc pour de vrai le client Resend et `sendResendEmail`
 * (succès comme refus d'API), sans contact réseau.
 */
function fakeResend({ fail = () => false } = {}) {
  const sent = []

  globalThis.fetch = async (url, options) => {
    const payload = bodyOf(options)
    sent.push(payload)
    if (fail(payload)) {
      return {
        ok: false,
        status: 422,
        statusText: 'Unprocessable Entity',
        headers: new Headers(),
        text: async () =>
          JSON.stringify({
            statusCode: 422,
            name: 'validation_error',
            message: 'Le domaine d’envoi n’est pas vérifié.'
          }),
        json: async () => ({})
      }
    }
    return {
      ok: true,
      status: 200,
      headers: new Headers(),
      text: async () => '',
      json: async () => ({ id: `email-${sent.length}` })
    }
  }

  return sent
}

const declaration = (overrides = {}) => ({
  firstName: 'Claire',
  lastName: 'Dupont',
  email: 'cliente@exemple.fr',
  orderReference: 'JLA-20260928-ABCDEF01',
  products: 'Un vase en grès',
  orderedAt: '2026-09-01',
  receivedAt: '2026-09-05',
  ...overrides
})

let requestCounter = 0

async function declare(body = {}) {
  const handler = (await import('../server/api/retractation.post.js')).default
  requestCounter += 1
  const raw = Buffer.from(JSON.stringify(body))
  const event = {
    headers: {
      origin: SITE_URL,
      // Une adresse par appel : la limite de débit de la route (3 POST par
      // heure et par IP) ne doit pas fausser les scénarios ni les masquer.
      'x-real-ip': `203.0.113.${requestCounter}`,
      'content-length': String(raw.length)
    },
    rawBody: raw
  }

  return { event, response: await handler(event) }
}

const sentTo = (sent, email) => sent.filter((payload) => payload.to === email)

test("un refus d'envoi du fournisseur laisse l'accusé en attente, puis un nouvel essai part", async () => {
  const email = 'reprise@exemple.fr'
  const strapi = fakeStrapi({ match: true })
  let receiptFails = true
  const sent = fakeResend({ fail: (payload) => receiptFails && payload.to === email })

  const first = await declare(declaration({ email }))

  assert.equal(first.response.receiptPending, true)
  assert.ok(first.response.reference, 'la déclaration reste identifiée par sa référence')
  assert.deepEqual(
    sent.map((payload) => payload.to),
    [SELLER_EMAIL, email],
    'le vendeur est alerté, puis l’accusé client est tenté'
  )
  assert.equal(strapi.created, 1, 'la déclaration est enregistrée malgré l’échec d’envoi')
  assert.equal(strapi.emailStatus[0].emailStatus, 'partially_sent')
  assert.equal(strapi.emailStatus[0].customerReceiptSentAt, undefined)

  // Le quota destinataire n'a pas été brûlé par l'échec : le nouvel essai
  // doit réellement envoyer l'accusé (et non se faire refuser en silence).
  receiptFails = false
  const second = await declare(declaration({ email }))

  assert.equal(second.response.receiptPending, false)
  assert.equal(sentTo(sent, email).length, 2, 'un échec puis un envoi accepté')
  assert.equal(strapi.created, 1, 'la déclaration en double n’est pas recréée')

  // L'envoi accepté consomme le quota du destinataire : l'accusé ne repart pas
  // une troisième fois.
  const third = await declare(declaration({ email }))

  assert.equal(third.response.receiptPending, true)
  assert.equal(sentTo(sent, email).length, 2, 'aucun nouvel envoi au même destinataire')
})

test("un échec de l'alerte vendeur ne prive pas le client de son accusé", async () => {
  const email = 'alerte@exemple.fr'
  fakeStrapi({ match: true })
  const sent = fakeResend({ fail: (payload) => payload.to === SELLER_EMAIL })

  const { response } = await declare(declaration({ email }))

  assert.equal(response.receiptPending, false)
  assert.equal(sentTo(sent, email).length, 1)
})

test("une vérification commande/adresse négative n'envoie aucun accusé", async () => {
  const email = 'inconnue@exemple.fr'
  const strapi = fakeStrapi({ match: false })
  const sent = fakeResend()

  const { response } = await declare(declaration({ email }))

  assert.equal(response.receiptPending, true)
  assert.equal(sentTo(sent, email).length, 0)
  assert.deepEqual(sent.map((payload) => payload.to), [SELLER_EMAIL])
  assert.equal(strapi.created, 1, 'la déclaration est enregistrée dans tous les cas')
})

test('une vérification impossible échoue fermé : aucun accusé, déclaration enregistrée', async () => {
  const email = 'panne@exemple.fr'
  const strapi = fakeStrapi({ verifyError: true })
  const sent = fakeResend()

  const { response } = await declare(declaration({ email }))

  assert.equal(response.receiptPending, true)
  assert.equal(sentTo(sent, email).length, 0)
  assert.equal(strapi.verifyCalls.length, 1)
  assert.equal(strapi.created, 1)
})

test('deux déclarations simultanées ne déclenchent qu’un seul accusé', async () => {
  const email = 'course@exemple.fr'
  const strapi = fakeStrapi({ match: true })
  // Déclaration déjà enregistrée : le vendeur n'est pas alerté une nouvelle
  // fois, seul l'envoi de l'accusé est en jeu.
  strapi.record = { reference: 'RET-20260928-COURSE01' }
  const sent = fakeResend()

  const [first, second] = await Promise.all([
    declare(declaration({ email })),
    declare(declaration({ email }))
  ])

  assert.equal(sentTo(sent, email).length, 1, 'un seul accusé malgré la concurrence')
  assert.deepEqual(
    [first.response.receiptPending, second.response.receiptPending].sort(),
    [false, true],
    'une requête envoie l’accusé, l’autre le signale en attente'
  )
})
