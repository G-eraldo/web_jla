import { createHash, randomBytes } from "node:crypto";

export const ORDER_REFERENCE_PATTERN = /^JLA-\d{8}-[A-F0-9]{8,32}$/;
const CUSTOMER_FIELDS = [
  "firstName",
  "lastName",
  "email",
  "phone",
  "addressLine1",
  "addressLine2",
  "postalCode",
  "city",
];
const CHECKOUT_FIELDS = [
  "customer",
  "delivery",
  "acceptedTerms",
  "promoCode",
  "items",
];
const DELIVERY_FIELDS = ["method", "pickupPoint", "pickupPointId"];

export function makeOrderReference() {
  return `JLA-${new Date().toISOString().slice(0, 10).replaceAll("-", "")}-${randomBytes(16).toString("hex").toUpperCase()}`;
}

export function aggregateCartLines(lines) {
  if (!Array.isArray(lines) || !lines.length || lines.length > 20) return [];

  const quantities = new Map();
  for (const line of lines) {
    const id = String(line?.id || "").trim();
    const quantity = Number(line?.quantity);
    if (!id || id.length > 100 || !Number.isInteger(quantity) || quantity < 1)
      return [];
    quantities.set(id, (quantities.get(id) || 0) + quantity);
  }

  const result = [...quantities]
    .map(([id, quantity]) => ({ id, quantity }))
    .sort((left, right) => left.id.localeCompare(right.id));

  const totalQuantity = result.reduce((sum, line) => sum + line.quantity, 0);
  if (
    !result.length ||
    result.some((line) => line.quantity > 10) ||
    totalQuantity > 30
  )
    return [];
  return result;
}

function unexpectedKeys(value, allowed) {
  return Object.keys(value || {}).some((key) => !allowed.includes(key));
}

export function checkoutFingerprint({ customer, delivery, items, promoCode }) {
  return createHash("sha256")
    .update(
      JSON.stringify({
        email: String(customer?.email || "")
          .trim()
          .toLowerCase(),
        items,
        delivery: {
          method: delivery?.method,
          pickupPointId: delivery?.pickupPointId || null,
        },
        promoCode:
          String(promoCode || "")
            .trim()
            .toUpperCase() || null,
      }),
    )
    .digest("hex");
}

export function validateCheckoutPayload(body) {
  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body) ||
    unexpectedKeys(body, CHECKOUT_FIELDS)
  ) {
    return { error: "La demande de commande est invalide." };
  }

  const customer = body.customer || {};
  const delivery = body.delivery || {};
  if (
    unexpectedKeys(customer, CUSTOMER_FIELDS) ||
    unexpectedKeys(delivery, DELIVERY_FIELDS)
  ) {
    return { error: "La demande de commande est invalide." };
  }

  const lines = aggregateCartLines(body.items);
  if (!lines.length) return { error: "Votre panier est invalide." };
  if (body.acceptedTerms !== true) {
    return { error: "Vous devez accepter les conditions générales de vente." };
  }

  const requiredCustomerFields = [
    "firstName",
    "lastName",
    "email",
    "phone",
    "addressLine1",
    "postalCode",
    "city",
  ];
  const cleanedCustomer = Object.fromEntries(
    CUSTOMER_FIELDS.map((field) => [
      field,
      String(customer[field] || "").trim(),
    ]),
  );
  if (
    requiredCustomerFields.some(
      (field) => !cleanedCustomer[field] || cleanedCustomer[field].length > 200,
    )
  ) {
    return { error: "Veuillez compléter vos informations de livraison." };
  }
  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedCustomer.email) ||
    cleanedCustomer.email.length > 254 ||
    !/^\d{5}$/.test(cleanedCustomer.postalCode)
  ) {
    return { error: "Vos coordonnées de livraison sont invalides." };
  }

  return {
    data: {
      customer: cleanedCustomer,
      delivery,
      promoCode:
        String(body.promoCode || "")
          .trim()
          .toUpperCase()
          .slice(0, 40) || null,
      items: lines,
    },
  };
}
