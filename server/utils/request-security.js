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
  if (!siteUrl) return;
  const site = new URL(siteUrl);
  const originHeader = getHeader(event, "origin");
  const refererHeader = getHeader(event, "referer");
  const candidate = originHeader || refererHeader;
  if (!candidate) {
    throw createError({
      statusCode: 403,
      message: "Origine de la requête manquante.",
    });
  }
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
