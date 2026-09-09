const CONTACT_RECIPIENT = 'maisonjla@outlook.com'
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const clean = value => String(value || '').trim()

const escapeHtml = value => clean(value).replace(
  /[&<>"']/g,
  character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]
)

export function validateContactPayload(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'Le formulaire est invalide.' }
  }

  const allowedFields = new Set(['firstName', 'lastName', 'email', 'subject', 'orderReference', 'message', 'website'])
  if (Object.keys(body).some(field => !allowedFields.has(field))) {
    return { error: 'Le formulaire contient un champ inattendu.' }
  }

  const contact = {
    firstName: clean(body.firstName),
    lastName: clean(body.lastName),
    email: clean(body.email).toLowerCase(),
    subject: clean(body.subject),
    orderReference: clean(body.orderReference),
    message: clean(body.message),
    website: clean(body.website)
  }

  if (
    !contact.firstName || contact.firstName.length > 100 ||
    !contact.lastName || contact.lastName.length > 100 ||
    !emailPattern.test(contact.email) || contact.email.length > 254 ||
    !contact.subject || contact.subject.length > 120 || /[\r\n]/.test(contact.subject) ||
    contact.orderReference.length > 100 ||
    !contact.message || contact.message.length > 5000
  ) {
    return { error: 'Veuillez vérifier les informations saisies.' }
  }

  return { data: contact }
}

export function buildContactEmail(contact) {
  const fullName = `${contact.firstName} ${contact.lastName}`
  const orderReference = contact.orderReference
    ? `<p style="margin:8px 0 0"><strong>Commande :</strong> ${escapeHtml(contact.orderReference)}</p>`
    : ''
  const textOrderReference = contact.orderReference ? `\nCommande : ${contact.orderReference}` : ''

  return {
    to: CONTACT_RECIPIENT,
    replyTo: contact.email,
    subject: `Contact — ${contact.subject}`,
    text: `Nouveau message reçu depuis maisonjla.fr\n\nNom : ${fullName}\nE-mail : ${contact.email}${textOrderReference}\nObjet : ${contact.subject}\n\n${contact.message}`,
    html: `<div style="margin:0;padding:40px 20px;background:#f5eee6;font-family:Arial,sans-serif;color:#302722"><div style="max-width:600px;margin:0 auto;background:#ffffff"><div style="padding:32px;text-align:center;border-bottom:1px solid #e9ddd3"><div style="font-family:Georgia,serif;font-size:30px;color:#302722">Maison JLA</div></div><div style="padding:32px"><h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:26px;font-weight:normal">Nouveau message reçu</h1><p>Un message a été envoyé depuis le formulaire de contact.</p><div style="margin:26px 0;padding:20px;background:#fdf7f2"><p style="margin:0"><strong>Nom :</strong> ${escapeHtml(fullName)}</p><p style="margin:8px 0 0"><strong>E-mail :</strong> ${escapeHtml(contact.email)}</p>${orderReference}<p style="margin:8px 0 0"><strong>Objet :</strong> ${escapeHtml(contact.subject)}</p></div><p style="margin:0 0 10px;font-weight:bold">Message</p><p style="margin:0;line-height:1.7;white-space:pre-wrap">${escapeHtml(contact.message)}</p><p style="margin-top:28px">Vous pouvez répondre directement à cet e-mail pour contacter ${escapeHtml(contact.firstName)}.</p></div><div style="padding:18px 32px;border-top:1px solid #e9ddd3;text-align:center;font-size:12px;color:#776b64">Maison JLA — Julia Touret EI<br>5 Rue Joliot-Curie — 80200 Doingt<br>maisonjla@outlook.com — 06 77 88 69 09</div></div></div>`
  }
}

export { CONTACT_RECIPIENT }
