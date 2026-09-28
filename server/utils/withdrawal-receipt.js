import { verifyOrderCustomerEmail } from "./mollie-order.js";
import { reserveQuotas } from "./request-security.js";

const DAY = 24 * 60 * 60 * 1000;

export const RECIPIENT_QUOTA = {
  name: "retractation-recipient",
  limit: 1,
  windowMs: DAY,
};
export const GLOBAL_QUOTA = {
  name: "retractation-global",
  key: "all",
  limit: 30,
  windowMs: DAY,
};

export function normalizeRecipientEmail(value) {
  return String(value || "")
    .trim()
    .toLowerCase();
}

export function normalizeOrderReference(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

/**
 * Autorise l'accusé de réception destiné au client.
 *
 * L'autorisation n'est accordée que si Strapi confirme que la référence
 * appartient bien à l'adresse déclarée : connaître une référence ne suffit
 * donc plus à faire envoyer un e-mail depuis le domaine de la boutique vers
 * une adresse arbitraire. La comparaison est faite sur des valeurs
 * normalisées (casse et espaces ignorés) des deux côtés.
 *
 * Une fois la commande reconnue, les quotas destinataire et global sont
 * réservés ensemble, pour qu'un refus du plafond global ne consomme pas
 * l'envoi quotidien du destinataire.
 *
 * Retourne la réservation de quotas — que l'appelant committe si l'envoi est
 * accepté, ou libère sinon —, et `false` quand l'envoi n'est pas autorisé.
 * La réservation n'est donc pas consommée tant que rien n'est parti.
 *
 * Toute erreur de vérification (Strapi indisponible, route absente, réponse
 * inattendue) refuse l'envoi : l'échec est fermé, la déclaration reste
 * enregistrée et l'accusé est signalé comme en attente.
 */
export async function authorizeCustomerReceipt({
  strapiUrl,
  orderReference,
  email,
  verify = verifyOrderCustomerEmail,
  reserve = reserveQuotas,
}) {
  const reference = normalizeOrderReference(orderReference);
  const recipient = normalizeRecipientEmail(email);
  if (!reference || !recipient) return false;

  let matches = false;
  try {
    matches = (await verify(strapiUrl, reference, recipient)) === true;
  } catch {
    return false;
  }
  if (!matches) return false;

  const reservation = reserve([
    { ...RECIPIENT_QUOTA, key: recipient },
    GLOBAL_QUOTA,
  ]);
  return reservation || false;
}
