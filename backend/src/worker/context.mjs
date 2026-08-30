function normalizedOrigins(env) {
  return [
    ...(env.FRONTEND_URLS || "").split(","),
    env.FRONTEND_URL || "",
    env.ADMIN_URL || "",
  ]
    .map((value) => value.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

export function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowedOrigins = new Set(normalizedOrigins(env));

  const headers = new Headers({
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With",
    "Access-Control-Max-Age": "86400",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });

  if (origin) {
    const normalizedOrigin = origin.replace(/\/+$/, "");
    if (allowedOrigins.has(normalizedOrigin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");
      headers.set("Vary", "Origin");
    }
  }

  return headers;
}

export function withCors(response, request, env) {
  const responseHeaders = new Headers(response.headers);
  const extraHeaders = corsHeaders(request, env);

  for (const [key, value] of extraHeaders.entries()) {
    responseHeaders.set(key, value);
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}
