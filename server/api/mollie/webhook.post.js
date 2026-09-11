import { createMollieClient } from "@mollie/api-client";
import {
  findOrderByDocumentId,
  findOrderByPaymentId,
  orderDocumentId,
  synchronizeOrderPayment,
  webhookPaymentId,
} from "../../utils/mollie-order.js";
import { requestAutomaticRefund } from "../../utils/mollie-refund.js";
import {
  enforceRateLimit,
  enforceRequestSize,
} from "../../utils/request-security.js";

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    name: "mollie-webhook",
    limit: 120,
    windowMs: 60 * 1000,
  });
  enforceRequestSize(event, 8 * 1024);
  const raw = await readRawBody(event, false);
  const size =
    raw == null
      ? 0
      : Buffer.isBuffer(raw)
        ? raw.length
        : Buffer.byteLength(String(raw));
  if (size > 8 * 1024)
    throw createError({
      statusCode: 413,
      message: "La requête est trop volumineuse.",
    });
  const text =
    raw == null
      ? ""
      : Buffer.isBuffer(raw)
        ? raw.toString("utf8")
        : String(raw);
  let payload = text;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = text;
  }

  const config = useRuntimeConfig();
  if (!config.mollieApiKey)
    throw createError({
      statusCode: 503,
      message: "Le paiement est en cours de configuration.",
    });
  const paymentId = webhookPaymentId(payload);
  if (!paymentId || !/^tr_[A-Za-z0-9]+$/.test(paymentId))
    throw createError({
      statusCode: 400,
      message: "Identifiant de paiement manquant.",
    });

  const client = createMollieClient({ apiKey: config.mollieApiKey });
  const payment = await client.payments.get(paymentId);
  const documentId = orderDocumentId(payment.metadata);
  const strapiUrl = config.public.strapiUrl.replace(/\/$/, "");
  const order = documentId
    ? await findOrderByDocumentId(strapiUrl, documentId)
    : await findOrderByPaymentId(strapiUrl, payment.id);
  if (!order) return { ok: true };
  const result = await synchronizeOrderPayment(strapiUrl, order, payment);
  if (result.refundRequired)
    await requestAutomaticRefund(client, strapiUrl, order, payment);
  return { ok: true };
});
