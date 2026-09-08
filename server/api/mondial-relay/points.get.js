export default defineEventHandler(async (event) => {
  const { postalCode } = getQuery(event);

  const code = String(postalCode || "").trim();

  if (!/^\d{5}$/.test(code)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Renseignez un code postal français à cinq chiffres.",
    });
  }

  const publicKey = process.env.SENDCLOUD_PUBLIC_KEY;
  const secretKey = process.env.SENDCLOUD_SECRET_KEY;

  if (!publicKey || !secretKey) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "La recherche de points relais est en cours de configuration.",
    });
  }

  const authorization = Buffer.from(`${publicKey}:${secretKey}`).toString(
    "base64",
  );

  try {
    const response = await $fetch(
      "https://servicepoints.sendcloud.sc/api/v2/service-points",
      {
        query: {
          country: "FR",
          address: code,
          radius: 15000,
          carrier: "mondial_relay",
        },

        headers: {
          Authorization: `Basic ${authorization}`,
        },
      },
    );

    const points = (response || []).map((point) => ({
      id: String(point.id),

      name: point.name || "Point Relais Mondial Relay",

      address: [point.street, point.house_number].filter(Boolean),

      postalCode: point.postal_code || "",

      city: point.city || "",

      distance: point.distance || null,

      label: [
        point.name,
        [point.street, point.house_number].filter(Boolean).join(" "),
        `${point.postal_code || ""} ${point.city || ""}`.trim(),
      ]
        .filter(Boolean)
        .join(", "),
    }));

    return {
      points,
    };
  } catch (error) {
    console.error("Sendcloud service points error:", error?.data || error);

    throw createError({
      statusCode: 502,
      statusMessage:
        "La recherche Mondial Relay est indisponible. Réessayez dans un instant.",
    });
  }
});
