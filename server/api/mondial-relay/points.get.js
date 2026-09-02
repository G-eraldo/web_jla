import { createHash } from 'node:crypto'

const endpoint = 'https://api.mondialrelay.fr/Web_Services.asmx'

const xmlEscape = value => String(value || '').replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[character])
const xmlDecode = value => String(value || '').replace(/<!\[CDATA\[|\]\]>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

function tag(xml, name) {
  const match = xml.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, 'i'))
  return match ? xmlDecode(match[1]) : ''
}

function detail(xml, name) {
  return tag(xml, name) || tag(xml, name.replace('Lg', ''))
}

function parsePoints(xml) {
  const details = xml.match(/<PointRelais_Details>[\s\S]*?<\/PointRelais_Details>/gi) || []
  return details.map(point => {
    const address = ['LgAdr1', 'LgAdr2', 'LgAdr3', 'LgAdr4'].map(field => detail(point, field)).filter(Boolean)
    const postalCode = tag(point, 'CP')
    const city = tag(point, 'Ville')
    const name = address.shift() || 'Point Relais Mondial Relay'
    return {
      id: tag(point, 'Num'),
      name,
      address,
      postalCode,
      city,
      distance: Number(tag(point, 'Distance')) || null,
      label: [name, ...address, `${postalCode} ${city}`.trim()].filter(Boolean).join(', ')
    }
  }).filter(point => /^\d{6}$/.test(point.id))
}

export default defineEventHandler(async event => {
  const { postalCode } = getQuery(event)
  const code = String(postalCode || '').trim()
  if (!/^\d{5}$/.test(code)) throw createError({ statusCode: 400, statusMessage: 'Renseignez un code postal français à cinq chiffres.' })

  const brandCode = process.env.MONDIAL_RELAY_BRAND_CODE
  const privateKey = process.env.MONDIAL_RELAY_PRIVATE_KEY
  if (!brandCode || !privateKey) throw createError({ statusCode: 503, statusMessage: 'La recherche de points Mondial Relay est en cours de configuration.' })

  const values = [brandCode, 'FR', '', '', code, '', '', '', '500', '24R', '1', '20', '', '10']
  const security = createHash('md5').update(`${values.join('')}${privateKey}`).digest('hex').toUpperCase()
  const fields = ['Enseigne', 'Pays', 'NumPointRelais', 'Ville', 'CP', 'Latitude', 'Longitude', 'Taille', 'Poids', 'Action', 'DelaiEnvoi', 'RayonRecherche', 'TypeActivite', 'NombreResultats']
  const body = `<?xml version="1.0" encoding="utf-8"?><soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"><soap:Body><WSI4_PointRelais_Recherche xmlns="http://www.mondialrelay.fr/webservice/">${fields.map((field, index) => `<${field}>${xmlEscape(values[index])}</${field}>`).join('')}<Security>${security}</Security></WSI4_PointRelais_Recherche></soap:Body></soap:Envelope>`

  let xml
  try {
    xml = await $fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: 'http://www.mondialrelay.fr/webservice/WSI4_PointRelais_Recherche' },
      body,
      responseType: 'text'
    })
  } catch {
    throw createError({ statusCode: 502, statusMessage: 'La recherche Mondial Relay est indisponible. Réessayez dans un instant.' })
  }

  const points = parsePoints(xml)
  if (!points.length && tag(xml, 'STAT') !== '0') throw createError({ statusCode: 502, statusMessage: 'Mondial Relay ne peut pas proposer de point relais pour cette adresse.' })
  return { points }
})
