export default defineEventHandler((event) => {
  const strapiUrl = String(useRuntimeConfig().public.strapiUrl || "").replace(
    /\/$/,
    "",
  );
  const connectSrc = ["'self'", strapiUrl].filter(Boolean).join(" ");
  const policy = [
    "default-src 'self'",
    "base-uri 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "img-src 'self' data: https://res.cloudinary.com",
    "font-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "script-src 'self' 'unsafe-inline'",
    `connect-src ${connectSrc}`,
    "upgrade-insecure-requests",
  ].join("; ");

  setResponseHeader(event, "Content-Security-Policy", policy);
  setResponseHeader(event, "X-Content-Type-Options", "nosniff");
  setResponseHeader(
    event,
    "Referrer-Policy",
    "strict-origin-when-cross-origin",
  );
  setResponseHeader(
    event,
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()",
  );
  setResponseHeader(event, "X-Frame-Options", "DENY");
  setResponseHeader(event, "Cross-Origin-Opener-Policy", "same-origin");
  setResponseHeader(event, "Cross-Origin-Resource-Policy", "same-origin");
  if (getRequestProtocol(event) === "https") {
    setResponseHeader(
      event,
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains",
    );
  }
  removeResponseHeader(event, "X-Powered-By");
  if (getRequestPath(event) === "/api/mollie/status") {
    setResponseHeader(event, "Cache-Control", "no-store");
    setResponseHeader(event, "Pragma", "no-cache");
  }
});
