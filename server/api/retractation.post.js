import { randomUUID } from "node:crypto";
import { Resend } from "resend";
import {
  enforceRateLimit,
  enforceSameOrigin,
  readLimitedJsonBody,
  sendResendEmail,
} from "../utils/request-security.js";
import { withdrawalEmailHtml } from "../utils/withdrawal-email.js";
import { authorizeCustomerReceipt } from "../utils/withdrawal-receipt.js";
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
const withdrawalDate = (date) =>
  new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "long",
    timeStyle: "long",
    timeZone: "Europe/Paris",
  }).format(date);
const fakeWithdrawalReference = (date) =>
  `RET-${date.toISOString().slice(0, 10).replaceAll("-", "")}-${randomUUID().slice(0, 8).toUpperCase()}`;

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
    // Champ piège rempli : répondre comme si la déclaration avait été
    // enregistrée, sans rien persister ni envoyer. Un rejet explicite
    // indiquerait au robot quel champ conditionne l'acceptation.
    const trapDate = new Date();
    return {
      reference: fakeWithdrawalReference(trapDate),
      sentAt: withdrawalDate(trapDate),
      receiptPending: false,
    };
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
  const sentAt = withdrawalDate(sentAtDate);
  const config = useRuntimeConfig();
  const saved = await persistWithdrawal({
    strapiUrl: config.public.strapiUrl,
    token: process.env.STRAPI_API_TOKEN,
    declaration,
  });
  const reference = saved.reference;
  const plainDeclaration = `Nom : ${declaration.firstName} ${declaration.lastName}\nE-mail : ${declaration.email}\nCommande : ${declaration.orderReference}\nProduits : ${declaration.products}\nDate de commande : ${declaration.orderedAt}\nDate de réception : ${declaration.receivedAt || "non renseignée"}\nDéclaration envoyée le : ${sentAt}\nRéférence : ${reference}`;
  const emailDeclaration = { ...declaration, sentAt, reference };
  const resend = new Resend(apiKey);

  // L'accusé de réception ne part que vers le client de la commande : Strapi
  // confirme que la référence appartient bien à l'adresse déclarée, puis les
  // quotas destinataire et global sont réservés ensemble. Sans ce
  // rapprochement, n'importe qui pouvait déclencher un e-mail vers une adresse
  // arbitraire depuis l'adresse légitime du domaine. La réservation reste
  // conditionnelle : elle n'est rendue définitive qu'après un envoi accepté,
  // et libérée sinon, pour qu'un nouvel essai légitime puisse partir.
  const customerReservation = await authorizeCustomerReceipt({
    strapiUrl: config.public.strapiUrl,
    orderReference: declaration.orderReference,
    email: declaration.email,
  });

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
        html: withdrawalEmailHtml({
          title: "Déclaration de rétractation reçue",
          intro: "Une déclaration de rétractation a été reçue.",
          declaration: emailDeclaration,
          closing: "Retrouvez la demande dans votre espace Maison JLA.",
        }),
      });
      sellerSent = true;
    }
  } catch {
    // Continue with the customer receipt even if the internal alert failed.
  }
  if (customerReservation) {
    try {
      await sendResendEmail(resend, {
        from,
        to: declaration.email,
        replyTo: sellerEmail,
        subject: `Accusé de réception de votre rétractation — Maison JLA`,
        text: `Votre déclaration de rétractation a été transmise à Maison JLA.\n\n${plainDeclaration}\n\nModalités de retour : renvoyez les articles au plus tard dans les quatorze jours suivant votre déclaration à Maison JLA — Julia Touret EI, 5 Rue Joliot-Curie, 80200 Doingt, France. Les frais directs de retour sont à votre charge. Conservez une preuve d'expédition. Le remboursement comprend les sommes versées, dont les frais de livraison standard ; il peut être différé jusqu'à la réception des articles ou de la preuve de leur expédition.\n\nConservez cet e-mail. Pour toute question, répondez à ce message.`,
        html: withdrawalEmailHtml({
          title: "Votre rétractation a bien été transmise",
          intro: "Conservez cet accusé de réception sur support durable.",
          declaration: emailDeclaration,
          closing:
            "Conservez cet e-mail. Pour toute question, répondez à ce message.",
          returnInstructions: true,
        }),
      });
      customerSent = true;
      // Envoi accepté : la réservation devient définitive.
      customerReservation.commit();
    } catch {
      // The legally operative declaration was already recorded. L'accusé n'est
      // toutefois pas parti : le quota réservé est rendu immédiatement, sinon
      // la cliente se verrait refuser une nouvelle déclaration pendant toute
      // la fenêtre sans avoir jamais reçu d'e-mail.
      customerReservation.release();
    }
  }
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

  if (!customerSent) {
    return { reference, sentAt, receiptPending: true };
  }

  return { reference, sentAt, receiptPending: false };
});
