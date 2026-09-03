import { json } from "../utils/http.mjs";

function normalizePostcode(value) {
  return String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

export async function postcodeLookupRoute(request, context) {
  try {
    const url = new URL(request.url);
    const postcode = normalizePostcode(url.searchParams.get("postcode"));

    if (!postcode) {
      return json({ message: "Enter a postcode" }, 400);
    }

    const endpoint =
      `https://api.postcodes.io/postcodes/${encodeURIComponent(postcode)}`;

    const response = await fetch(endpoint, {
      headers: { Accept: "application/json" },
    });

    const payload = await response.json().catch(() => ({}));

    if (response.status === 404 || payload?.status === 404) {
      return json({ message: "Postcode not found" }, 404);
    }

    if (!response.ok) {
      return json(
        {
          message:
            "Postcode lookup is temporarily unavailable. Please enter the address manually.",
        },
        502
      );
    }

    const result = payload?.result || {};

    return json({
      postcode: result.postcode || postcode,
      city: result.admin_district || result.parish || "",
      county: result.admin_county || result.region || "",
      country: result.country || "",
    });
  } catch (error) {
    console.error("Postcode lookup failed:", error);
    return json(
      {
        message:
          "Postcode lookup is temporarily unavailable. Please enter the address manually.",
      },
      500
    );
  }
}
