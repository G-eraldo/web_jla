import { createMollieClient } from "@mollie/api-client";
import { ORDER_REFERENCE_PATTERN } from "../../utils/checkout.js";
import {
  findOrderByReference,
  orderDocumentId,
  synchronizeOrderPayment,
} from "../../utils/mollie-order.js";
import { requestAutomaticRefund } from "../../utils/mollie-refund.js";
import {
  enforceRateLimit,
  enforceSameOrigin,
  readLimitedJsonBody,
} from "../../utils/request-security.js";

export default defineEventHandler(async (event) => {
  enforceSameOrigin(event);
  enforceRateLimit(event, {
    name: "mollie-sync",
    limit: 12,
    windowMs: 60 * 1000,
  });
  setHeader(event, "Cache-Control", "no-store");
  const config = useRuntimeConfig();
  if (!config.mollieApiKey)
    throw createError({
      statusCode: 503,
      message: "Le paiement est en cours de configuration.",
    });

  const body = await readLimitedJsonBody(event, 2_000);
  const reference = String(body.reference || "")
    .trim()
    .toUpperCase();
  if (!ORDER_REFERENCE_PATTERN.test(reference))
    throw createError({
      statusCode: 400,
      message: "Référence de commande invalide.",
    });

  const strapiUrl = config.public.strapiUrl.replace(/\/$/, "");
  const order = await findOrderByReference(strapiUrl, reference);
  if (!order?.molliePaymentId) return { status: "pending" };

  const client = createMollieClient({ apiKey: config.mollieApiKey });
  const payment = await client.payments.get(order.molliePaymentId);
  if (orderDocumentId(payment.metadata) !== order.documentId)
    throw createError({
      statusCode: 409,
      message: "Le paiement ne correspond pas à cette commande.",
    });

  const result = await synchronizeOrderPayment(strapiUrl, order, payment);
  if (result.refundRequired)
    await requestAutomaticRefund(client, strapiUrl, order, payment);
  return { status: result.status || "pending" };
});
