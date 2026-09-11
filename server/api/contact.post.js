import { Resend } from "resend";
import { buildContactEmail, validateContactPayload } from "../utils/contact.js";
import {
  enforceRateLimit,
  enforceSameOrigin,
  readLimitedJsonBody,
  sendResendEmail,
} from "../utils/request-security.js";

export default defineEventHandler(async (event) => {
  enforceSameOrigin(event);
  enforceRateLimit(event, {
    name: "contact",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });

  const validation = validateContactPayload(
    await readLimitedJsonBody(event, 16 * 1024),
  );
  if (validation.error) {
    throw createError({ statusCode: 400, message: validation.error });
  }

  if (validation.data.website) return { sent: true };

  const config = useRuntimeConfig();
  if (!config.resendApiKey || !config.resendFrom) {
    throw createError({
      statusCode: 503,
      message:
        "Le formulaire est temporairement indisponible. Écrivez à contact@maisonjla.fr.",
    });
  }

  const email = buildContactEmail(validation.data);
  try {
    await sendResendEmail(new Resend(config.resendApiKey), {
      from: config.resendFrom,
      ...email,
    });
  } catch {
    throw createError({
      statusCode: 502,
      message:
        "Le message n’a pas pu être envoyé. Vous pouvez écrire à contact@maisonjla.fr.",
    });
  }

  return { sent: true };
});
