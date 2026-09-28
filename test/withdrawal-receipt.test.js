import assert from 'node:assert/strict'
import test from 'node:test'

const { authorizeCustomerReceipt } = await import('../server/utils/withdrawal-receipt.js')

const base = {
  strapiUrl: 'https://back.example.test',
  orderReference: 'JLA-20260928-ABCDEF01',
  email: 'cliente@exemple.fr'
}

test("une adresse différente de celle de la commande est refusée", async () => {
  const checked = []
  const reservations = []

  const allowed = await authorizeCustomerReceipt({
    ...base,
    email: 'attaquant@exemple.fr',
    verify: async (strapiUrl, reference, email) => {
      checked.push({ strapiUrl, reference, email })
      return false
    },
    reserve: (entries) => {
      reservations.push(entries)
      return true
    }
  })

  assert.equal(allowed, false)
  assert.deepEqual(checked, [
    {
      strapiUrl: 'https://back.example.test',
      reference: 'JLA-20260928-ABCDEF01',
      email: 'attaquant@exemple.fr'
    }
  ])
  assert.deepEqual(reservations, [], 'aucun quota ne doit être réservé sans correspondance')
})

test('la casse et les espaces de la référence et de l’adresse sont tolérés', async () => {
  const checked = []
  const reservations = []

  const allowed = await authorizeCustomerReceipt({
    ...base,
    orderReference: '  jla-20260928-abcdef01 ',
    email: ' Cliente@Exemple.FR ',
    verify: async (strapiUrl, reference, email) => {
      checked.push({ strapiUrl, reference, email })
      return true
    },
    reserve: (entries) => {
      reservations.push(entries)
      return true
    }
  })

  assert.equal(allowed, true)
  assert.deepEqual(checked, [
    {
      strapiUrl: 'https://back.example.test',
      reference: 'JLA-20260928-ABCDEF01',
      email: 'cliente@exemple.fr'
    }
  ])
  assert.deepEqual(reservations, [
    [
      { name: 'retractation-recipient', key: 'cliente@exemple.fr', limit: 1, windowMs: 86_400_000 },
      { name: 'retractation-global', key: 'all', limit: 30, windowMs: 86_400_000 }
    ]
  ])
})

test('une vérification impossible (Strapi indisponible) refuse l’envoi', async () => {
  const reservations = []

  const allowed = await authorizeCustomerReceipt({
    ...base,
    verify: async () => {
      throw Object.assign(new Error('Not Found'), { statusCode: 404 })
    },
    reserve: (entries) => {
      reservations.push(entries)
      return true
    }
  })

  assert.equal(allowed, false)
  assert.deepEqual(reservations, [])
})

test('le refus du plafond global ne laisse pas l’envoi du destinataire consommé', async () => {
  const reservations = []

  const allowed = await authorizeCustomerReceipt({
    ...base,
    verify: async () => true,
    // La réservation groupée refuse : le quota du destinataire ne doit pas
    // avoir été débité pour autant.
    reserve: (entries) => {
      reservations.push(entries)
      return false
    }
  })

  assert.equal(allowed, false)
  assert.equal(reservations.length, 1, 'les deux quotas doivent être réservés ensemble')
  assert.deepEqual(
    reservations[0].map((entry) => [entry.name, entry.key]),
    [
      ['retractation-recipient', 'cliente@exemple.fr'],
      ['retractation-global', 'all']
    ]
  )
})

test('une déclaration sans référence ou sans adresse ne déclenche aucune vérification', async () => {
  const checked = []

  const verify = async (strapiUrl, reference, email) => {
    checked.push({ strapiUrl, reference, email })
    return true
  }

  assert.equal(await authorizeCustomerReceipt({ ...base, orderReference: '   ', verify }), false)
  assert.equal(await authorizeCustomerReceipt({ ...base, email: '', verify }), false)
  assert.deepEqual(checked, [])
})
