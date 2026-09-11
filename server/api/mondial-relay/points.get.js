import { enforceRateLimit } from "../../utils/request-security.js";
import { findMondialRelayPoints } from "../../utils/sendcloud-service-points.js";

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    name: "mondial-relay-points",
    limit: 20,
    windowMs: 60 * 1000,
  });
  const { postalCode } = getQuery(event);

  const code = String(postalCode || "").trim();

  if (!/^\d{5}$/.test(code)) {
    throw createError({
      statusCode: 400,
      message: "Renseignez un code postal français à cinq chiffres.",
    });
  }

  try {
    return { points: await findMondialRelayPoints(code) };
  } catch (error) {
    console.error(
      "Sendcloud service points error:",
      error?.statusCode || error?.message,
    );

    throw createError({
      statusCode: error.statusCode || 502,
      message:
        error.message ||
        "La recherche Mondial Relay est indisponible. Réessayez dans un instant.",
    });
  }
});
