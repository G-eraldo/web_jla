import { Resend } from "resend";
import {
  enforceRateLimit,
  enforceSameOrigin,
  readLimitedJsonBody,
  sendResendEmail,
} from "../utils/request-security.js";
import {
  persistWithdrawal,
  recordWithdrawalEmails,
} from "../utils/withdrawal.js";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedFields = new Set([
  "firstName",
  "lastName",
  "email",
  "orderReference",
  "products",
  "orderedAt",
  "receivedAt",
  "website",
]);
const clean = (value, maxLength) =>
  String(value || "")
    .trim()
    .slice(0, maxLength);
const escapeHtml = (value) =>
  clean(value, 2000).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
      })[character],
  );

export default defineEventHandler(async (event) => {
  enforceSameOrigin(event);
  enforceRateLimit(event, {
    name: "retractation",
    limit: 3,
    windowMs: 60 * 60 * 1000,
  });
  const body = await readLimitedJsonBody(event, 16 * 1024);
  if (Object.keys(body).some((field) => !allowedFields.has(field))) {
    throw createError({
      statusCode: 400,
      message: "La demande contient un champ inattendu.",
    });
  }
  if (body?.website) {
    throw createError({
      statusCode: 400,
      message:
        "La demande n’a pas pu être envoyée. Vous pouvez écrire à contact@maisonjla.fr.",
    });
  }

  const declaration = {
    firstName: clean(body?.firstName, 100),
    lastName: clean(body?.lastName, 100),
    email: clean(body?.email, 254).toLowerCase(),
    orderReference: clean(body?.orderReference, 100),
    products: clean(body?.products, 2000),
    orderedAt: clean(body?.orderedAt, 10),
    receivedAt: clean(body?.receivedAt, 10),
  };
  if (
    Object.values(declaration).some((value) => /[\r\n]/.test(value)) ||
    !declaration.firstName ||
    !declaration.lastName ||
    !emailPattern.test(declaration.email) ||
    !declaration.orderReference ||
    !declaration.products ||
    !/^\d{4}-\d{2}-\d{2}$/.test(declaration.orderedAt) ||
    (declaration.receivedAt &&
      !/^\d{4}-\d{2}-\d{2}$/.test(declaration.receivedAt))
  ) {
    throw createError({
      statusCode: 400,
      message:
        "Veuillez compléter les informations nécessaires à l’identification de la commande.",
    });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM;
  const sellerEmail = process.env.RETRACTATION_TO || "contact@maisonjla.fr";
  if (!apiKey || !from)
    throw createError({
      statusCode: 503,
      message:
        "L’envoi est temporairement indisponible. Écrivez à contact@maisonjla.fr.",
    });

  const sentAtDate = new Date();
  const sentAt = new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "long",
    timeZone: "Europe/Paris",
  }).format(sentAtDate);
  const config = useRuntimeConfig();
  const saved = await persistWithdrawal({
    strapiUrl: config.public.strapiUrl,
    token: process.env.STRAPI_API_TOKEN,
    declaration,
    declaredAt: sentAtDate,
  });
  const reference = saved.reference;
  const plainDeclaration = `Nom : ${declaration.firstName} ${declaration.lastName}\nE-mail : ${declaration.email}\nCommande : ${declaration.orderReference}\nProduits : ${declaration.products}\nDate de commande : ${declaration.orderedAt}\nDate de réception : ${declaration.receivedAt || "non renseignée"}\nDéclaration envoyée le : ${sentAt}\nRéférence : ${reference}`;
  const htmlDeclaration = `<dl><dt><strong>Nom</strong></dt><dd>${escapeHtml(declaration.firstName)} ${escapeHtml(declaration.lastName)}</dd><dt><strong>E-mail</strong></dt><dd>${escapeHtml(declaration.email)}</dd><dt><strong>Commande</strong></dt><dd>${escapeHtml(declaration.orderReference)}</dd><dt><strong>Produit ou produits</strong></dt><dd>${escapeHtml(declaration.products).replaceAll("\n", "<br>")}</dd><dt><strong>Date de commande</strong></dt><dd>${escapeHtml(declaration.orderedAt)}</dd><dt><strong>Date de réception</strong></dt><dd>${escapeHtml(declaration.receivedAt || "non renseignée")}</dd><dt><strong>Envoi</strong></dt><dd>${escapeHtml(sentAt)}</dd><dt><strong>Référence</strong></dt><dd>${reference}</dd></dl>`;
  const resend = new Resend(apiKey);

  let sellerSent = false;
  let customerSent = false;
  try {
    if (!saved.duplicate) {
      await sendResendEmail(resend, {
        from,
        to: sellerEmail,
        replyTo: declaration.email,
        subject: `Rétractation ${declaration.orderReference} — ${reference}`,
        text: `Une déclaration de rétractation a été reçue.\n\n${plainDeclaration}`,
        html: `<h1>Déclaration de rétractation reçue</h1>${htmlDeclaration}`,
      });
      sellerSent = true;
    }
  } catch {
    // Continue with the customer receipt even if the internal alert failed.
  }
  try {
    await sendResendEmail(resend, {
      from,
      to: declaration.email,
      replyTo: sellerEmail,
      subject: `Accusé de réception de votre rétractation — Maison JLA`,
      text: `Votre déclaration de rétractation a été transmise à Maison JLA.\n\n${plainDeclaration}\n\nConservez cet e-mail. Maison JLA vous indiquera les modalités de retour.`,
      html: `<h1>Votre rétractation a bien été transmise</h1><p>Conservez cet accusé de réception sur support durable.</p>${htmlDeclaration}<p>Maison JLA vous indiquera les modalités de retour.</p>`,
    });
    customerSent = true;
  } catch {
    // The legally operative declaration was already recorded.
  } finally {
    try {
      await recordWithdrawalEmails({
        strapiUrl: config.public.strapiUrl,
        token: process.env.STRAPI_API_TOKEN,
        documentId: saved.documentId,
        sellerSent,
        customerSent,
      });
    } catch {
      // The declaration remains stored; an administrator can safely resend it.
    }
  }

  if (!customerSent) {
    return { reference, sentAt, receiptPending: true };
  }

  return { reference, sentAt, receiptPending: false };
});
