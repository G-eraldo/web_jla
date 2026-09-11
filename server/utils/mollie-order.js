const statuses = new Set(["pending", "paid", "failed", "canceled", "expired"]);

export function mollieStatus(status) {
  return statuses.has(status) ? status : "pending";
}

export function orderDocumentId(metadata) {
  if (metadata && typeof metadata === "object")
    return metadata.orderDocumentId || null;
  try {
    return JSON.parse(metadata || "{}").orderDocumentId || null;
  } catch {
    return null;
  }
}

export function webhookPaymentId(payload) {
  if (typeof payload?.id === "string") return payload.id;
  if (typeof payload !== "string") return null;
  return new URLSearchParams(payload).get("id");
}

export function strapiHeaders() {
  const token = process.env.STRAPI_API_TOKEN;
  if (!token)
    throw createError({
      statusCode: 503,
      message: "La boutique est en cours de configuration.",
    });
  return { Authorization: `Bearer ${token}` };
}

async function fetchPaymentView(url) {
  try {
    const response = await $fetch(url, { headers: strapiHeaders() });
    return response.data || null;
  } catch (error) {
    if (error?.statusCode === 404 || error?.status === 404) return null;
    throw error;
  }
}

export async function findOrderByDocumentId(strapiUrl, documentId) {
  return fetchPaymentView(
    `${strapiUrl}/api/orders/payment-view/${encodeURIComponent(documentId)}`,
  );
}

export async function findOrderByPaymentId(strapiUrl, paymentId) {
  return fetchPaymentView(
    `${strapiUrl}/api/orders/by-payment/${encodeURIComponent(paymentId)}`,
  );
}

export async function findOrderByReference(strapiUrl, reference) {
  return fetchPaymentView(
    `${strapiUrl}/api/orders/by-reference/${encodeURIComponent(reference)}`,
  );
}

export async function synchronizeOrderPayment(strapiUrl, order, payment) {
  if (!order || order.molliePaymentId !== payment.id)
    return { status: null, refundRequired: false };

  const status = mollieStatus(payment.status);
  if (status === "paid") {
    const response = await $fetch(
      `${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/confirm-paid-reservation`,
      {
        method: "POST",
        headers: strapiHeaders(),
        body: { data: { paidAt: payment.paidAt || new Date().toISOString() } },
      },
    );
    return { status, refundRequired: Boolean(response?.data?.refundRequired) };
  }

  if (order.paymentStatus !== status) {
    await $fetch(
      `${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/record-payment-outcome`,
      {
        method: "POST",
        headers: strapiHeaders(),
        body: { data: { paymentStatus: status } },
      },
    );
  }

  if (["failed", "canceled", "expired"].includes(status)) {
    await $fetch(
      `${strapiUrl}/api/orders/${encodeURIComponent(order.documentId)}/release-reservation`,
      {
        method: "POST",
        headers: strapiHeaders(),
      },
    );
  }

  return { status, refundRequired: false };
}
