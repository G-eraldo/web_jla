import { Resend } from "resend";
import { buildContactEmail, validateContactPayload } from "../utils/contact.js";
import {
  enforceRateLimit,
  enforceRequestSize,
} from "../utils/request-security.js";

export default defineEventHandler(async (event) => {
  enforceRateLimit(event, {
    name: "contact",
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  enforceRequestSize(event, 16 * 1024);

  const validation = validateContactPayload(await readBody(event));
  if (validation.error) {
    throw createError({ statusCode: 400, statusMessage: validation.error });
  }

  if (validation.data.website) return { sent: true };

  const config = useRuntimeConfig();
  if (!config.resendApiKey || !config.resendFrom) {
    throw createError({
      statusCode: 503,
      statusMessage:
        "Le formulaire est temporairement indisponible. Écrivez à maisonjla@outlook.com.",
    });
  }

  const email = buildContactEmail(validation.data);
  try {
    const { error } = await new Resend(config.resendApiKey).emails.send({
      from: config.resendFrom,
      ...email,
    });
    if (error) throw error;
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage:
        "Le message n’a pas pu être envoyé. Vous pouvez écrire à maisonjla@outlook.com.",
    });
  }

  return { sent: true };
});
