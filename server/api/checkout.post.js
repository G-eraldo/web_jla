import { createMollieClient } from "@mollie/api-client";
import {
  checkoutFingerprint,
  makeOrderReference,
  validateCheckoutPayload,
} from "../utils/checkout.js";
import { isValidPickupSelection } from "../utils/delivery.js";
import {
  enforceRateLimit,
  enforceSameOrigin,
  readLimitedJsonBody,
} from "../utils/request-security.js";
import { validateMondialRelayPoint } from "../utils/sendcloud-service-points.js";

function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token)
    throw createError({
      statusCode: 503,
      message: "La boutique est en cours de configuration.",
    });
  return { Authorization: `Bearer ${token}` };
}

export default defineEventHandler(async (event) => {
  enforceSameOrigin(event);
  enforceRateLimit(event, {
    name: "checkout",
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });
  const config = useRuntimeConfig();
  if (!config.mollieApiKey)
    throw createError({
      statusCode: 503,
      message: "Le paiement est en cours de configuration.",
    });

  const validation = validateCheckoutPayload(
    await readLimitedJsonBody(event, 20_000),
  );
  if (validation.error)
    throw createError({ statusCode: 400, message: validation.error });

  const { customer, delivery, promoCode, items } = validation.data;
  if (
    !["home", "pickup"].includes(delivery.method) ||
    !isValidPickupSelection(delivery)
  ) {
    throw createError({
      statusCode: 400,
      message: "Veuillez sélectionner un point relais Mondial Relay.",
    });
  }

  let pickupPoint = null;
  if (delivery.method === "pickup") {
    try {
      pickupPoint = await validateMondialRelayPoint(delivery.pickupPointId);
    } catch (error) {
      throw createError({
        statusCode: error.statusCode || 502,
        message: error.message,
      });
    }
  }

  const strapiUrl = config.public.strapiUrl.replace(/\/$/, "");
  try {
    const response = await $fetch(
      `${strapiUrl}/api/products?fields[0]=documentId&pagination[pageSize]=1`,
    );
    if (!response.data?.length) throw new Error("catalogue vide");
  } catch {
    throw createError({
      statusCode: 503,
      message:
        "Le catalogue est temporairement indisponible. Veuillez réessayer.",
    });
  }

  const reference = makeOrderReference();
  const checkoutKey = checkoutFingerprint({
    customer,
    delivery,
    items,
    promoCode,
  });
  let order;
  try {
    const created = await $fetch(`${strapiUrl}/api/orders/reserve`, {
      method: "POST",
      headers: strapiHeaders(),
      body: {
        data: {
          reference,
          checkoutKey,
          customer,
          delivery: {
            method: delivery.method,
            pickupPoint: pickupPoint?.label || null,
            pickupPointId: pickupPoint?.id || null,
          },
          promoCode,
          items: items.map((line) => ({
            productDocumentId: line.id,
            quantity: line.quantity,
          })),
        },
      },
    });
    order = created.data;
  } catch (error) {
    throw createError({
      statusCode: error?.statusCode || 503,
      message:
        error?.data?.error?.message ||
        "La réservation du stock est temporairement indisponible.",
    });
  }

  const siteUrl = config.public.siteUrl.replace(/\/$/, "");
  const mollie = createMollieClient({ apiKey: config.mollieApiKey });
  if (order.molliePaymentId) {
    try {
      const existing = await mollie.payments.get(order.molliePaymentId);
      const checkoutUrl =
        existing.getCheckoutUrl?.() || existing._links?.checkout?.href;
      if (["open", "pending"].includes(existing.status) && checkoutUrl)
        return { checkoutUrl, reference: order.reference };
    } catch {
      // An uncertain lookup must never create another payment for this order.
    }
    throw createError({
      statusCode: 409,
      message: "Ce paiement ne peut plus être repris. Veuillez réessayer dans quelques instants.",
    });
  }

  let payment;
  try {
    payment = await mollie.payments.create({
      amount: {
        currency: "EUR",
        value: Number(order.totalAmount).toFixed(2),
      },
      description: `Maison JLA · ${order.reference}`,
      redirectUrl: `${siteUrl}/commande/merci?reference=${encodeURIComponent(order.reference)}`,
      metadata: { orderDocumentId: order.documentId },
      // Stable for this reservation: concurrent requests receive the same payment.
      idempotencyKey: `maison-jla-order-${order.documentId}`,
      ...(!siteUrl.includes("localhost") && !siteUrl.includes("127.0.0.1")
        ? { webhookUrl: `${siteUrl}/api/mollie/webhook` }
        : {}),
    });
    await $fetch(
      `${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/attach-payment`,
      {
        method: "POST",
        headers: strapiHeaders(),
        body: { data: { molliePaymentId: payment.id } },
      },
    );
  } catch (error) {
    // Mollie may have accepted the request even when the response or attachment
    // failed. Keep the reservation for webhook/reconciliation to recover it.
    throw createError({
      statusCode: 502,
      message:
        "Le paiement est temporairement indisponible. Veuillez réessayer sans modifier votre panier.",
    });
  }

  return { checkoutUrl: payment.getCheckoutUrl(), reference: order.reference };
});
