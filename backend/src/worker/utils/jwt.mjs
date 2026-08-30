function base64UrlEncodeBytes(bytes) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function base64UrlEncodeText(text) {
  return base64UrlEncodeBytes(new TextEncoder().encode(text));
}

function base64UrlDecodeText(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

async function importSecret(secret) {
  if (!secret) {
    throw Object.assign(
      new Error("JWT_SECRET is not configured"),
      { status: 500 }
    );
  }

  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

export async function signJwt(payload, secret, expiresInSeconds = 7 * 24 * 60 * 60) {
  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "HS256",
    typ: "JWT",
  };

  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds,
  };

  const unsigned = `${base64UrlEncodeText(JSON.stringify(header))}.${base64UrlEncodeText(
    JSON.stringify(body)
  )}`;

  const key = await importSecret(secret);
  const signature = new Uint8Array(
    await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(unsigned))
  );

  return `${unsigned}.${base64UrlEncodeBytes(signature)}`;
}

export async function verifyJwt(token, secret) {
  if (!token || typeof token !== "string") {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  const [encodedHeader, encodedPayload, encodedSignature] = parts;

  let header;
  let payload;

  try {
    header = JSON.parse(base64UrlDecodeText(encodedHeader));
    payload = JSON.parse(base64UrlDecodeText(encodedPayload));
  } catch {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  if (header.alg !== "HS256") {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  const signatureBase64 = encodedSignature
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const paddedSignature =
    signatureBase64 + "=".repeat((4 - (signatureBase64.length % 4)) % 4);
  const signatureBinary = atob(paddedSignature);
  const signatureBytes = Uint8Array.from(
    signatureBinary,
    (char) => char.charCodeAt(0)
  );

  const key = await importSecret(secret);

  const valid = await crypto.subtle.verify(
    "HMAC",
    key,
    signatureBytes,
    new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`)
  );

  const now = Math.floor(Date.now() / 1000);

  if (!valid || !payload.exp || payload.exp <= now) {
    throw Object.assign(new Error("Invalid or expired token"), { status: 401 });
  }

  return payload;
}
