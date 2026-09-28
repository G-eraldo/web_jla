const buckets = new Map();

function clientKey(event) {
  const trusted =
    getHeader(event, "x-real-ip") || getHeader(event, "cf-connecting-ip");
  if (trusted) return String(trusted).split(",")[0].trim() || "unknown";
  return getRequestIP(event) || "unknown";
}

function pruneBuckets(now) {
  if (buckets.size <= 10_000) return;
  for (const [bucketKey, value] of buckets) {
    if (value.resetAt <= now) buckets.delete(bucketKey);
  }
  if (buckets.size > 10_000) {
    const oldest = [...buckets.entries()].sort(
      (left, right) => left[1].resetAt - right[1].resetAt,
    );
    for (const [bucketKey] of oldest.slice(0, buckets.size - 8_000))
      buckets.delete(bucketKey);
  }
}

export function enforceRequestSize(event, maxBytes) {
  const lengthHeader = getHeader(event, "content-length");
  if (lengthHeader == null || lengthHeader === "") return;
  const length = Number(lengthHeader);
  if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
    throw createError({
      statusCode: 413,
      message: "La requête est trop volumineuse.",
    });
  }
}

export async function readLimitedJsonBody(event, maxBytes) {
  enforceRequestSize(event, maxBytes);
  const raw = await readRawBody(event, false);
  if (raw == null) return {};
  const size = Buffer.isBuffer(raw)
    ? raw.length
    : Buffer.byteLength(String(raw));
  if (size > maxBytes) {
    throw createError({
      statusCode: 413,
      message: "La requête est trop volumineuse.",
    });
  }
  if (size === 0) return {};
  try {
    const parsed = JSON.parse(
      Buffer.isBuffer(raw) ? raw.toString("utf8") : String(raw),
    );
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("invalid");
    }
    return parsed;
  } catch {
    throw createError({ statusCode: 400, message: "La requête est invalide." });
  }
}

export function enforceRateLimit(event, { name, limit, windowMs }) {
  const now = Date.now();
  const key = `${name}:${clientKey(event)}`;
  const previous = buckets.get(key);
  const bucket =
    !previous || previous.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : previous;

  bucket.count += 1;
  buckets.set(key, bucket);
  pruneBuckets(now);

  setResponseHeader(event, "RateLimit-Limit", String(limit));
  setResponseHeader(
    event,
    "RateLimit-Remaining",
    String(Math.max(0, limit - bucket.count)),
  );
  setResponseHeader(
    event,
    "RateLimit-Reset",
    String(Math.ceil(bucket.resetAt / 1000)),
  );
  if (bucket.count > limit) {
    setResponseHeader(
      event,
      "Retry-After",
      String(Math.max(1, Math.ceil((bucket.resetAt - now) / 1000))),
    );
    throw createError({
      statusCode: 429,
      message: "Trop de requêtes. Veuillez réessayer dans quelques instants.",
    });
  }
}

export function enforceSameOrigin(event) {
  const siteUrl = String(useRuntimeConfig().public.siteUrl || "").replace(
    /\/$/,
    "",
  );
  const originHeader = getHeader(event, "origin");
  const refererHeader = getHeader(event, "referer");
  const candidate = originHeader || refererHeader;
  if (!siteUrl) {
    // Échec fermé : sans URL de site configurée, aucun contrôle d'origine
    // n'est possible. Mieux vaut refuser les requêtes d'état que de laisser
    // disparaître silencieusement la seule protection anti-CSRF des POST.
    throw createError({
      statusCode: 403,
      message: "Origine de la requête non vérifiable.",
    });
  }
  if (!candidate) {
    throw createError({
      statusCode: 403,
      message: "Origine de la requête manquante.",
    });
  }
  const site = new URL(siteUrl);
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw createError({
      statusCode: 403,
      message: "Origine de la requête invalide.",
    });
  }
  if (parsed.protocol !== site.protocol || parsed.host !== site.host) {
    throw createError({
      statusCode: 403,
      message: "Origine de la requête non autorisée.",
    });
  }
}

export async function sendResendEmail(resend, payload) {
  const result = await resend.emails.send(payload);
  if (result?.error) {
    const error = new Error(
      result.error.message || "L’envoi de l’e-mail a échoué.",
    );
    error.cause = result.error;
    throw error;
  }
  return result?.data || result;
}

export { clientKey };

const quotas = new Map();

function pruneQuotas(now) {
  if (quotas.size <= 5_000) return;
  for (const [quotaKey, value] of quotas) {
    if (value.resetAt <= now) quotas.delete(quotaKey);
  }
}

/**
 * Réserve plusieurs quotas en une seule opération : tous les plafonds sont
 * vérifiés avant qu'aucun compteur ne soit incrémenté (aucun `await` entre la
 * vérification et l'incrément). Sans cette atomicité, un destinataire pouvait
 * perdre son unique envoi quotidien alors que le plafond global refusait
 * l'envoi, puis rester bloqué après la réouverture du quota global.
 */
export function reserveQuotas(entries) {
  const now = Date.now();
  const reservations = [];

  for (const { name, key, limit, windowMs } of entries) {
    const quotaKey = `${name}:${String(key || "unknown").trim().toLowerCase()}`;
    const previous = quotas.get(quotaKey);
    const bucket =
      !previous || previous.resetAt <= now
        ? { count: 0, resetAt: now + windowMs }
        : previous;
    if (bucket.count >= limit) return false;
    reservations.push({ quotaKey, bucket });
  }

  for (const { quotaKey, bucket } of reservations) {
    bucket.count += 1;
    quotas.set(quotaKey, bucket);
  }
  pruneQuotas(now);
  return true;
}

/**
 * Consomme un quota simple, en mémoire du process (comme les limites de débit :
 * remis à zéro au redéploiement). Retourne false quand le quota est épuisé.
 * Sert à plafonner les envois d'e-mails, par destinataire et globalement.
 */
export function consumeQuota(name, key, { limit, windowMs }) {
  return reserveQuotas([{ name, key, limit, windowMs }]);
}
