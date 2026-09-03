import { json } from "../utils/http.mjs";

export async function resendDiagnosticRoute(request, context) {
  try {
    if (!context.env.RESEND_API_KEY) {
      return json(
        {
          ok: false,
          message: "RESEND_API_KEY is not configured",
        },
        500
      );
    }

    const response = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${context.env.RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: "KK Closet <hello@kkcloset.uk>",
          to: ["ullujanata@gmail.com"],
          subject: "KK Closet Worker Diagnostic",
          text: "Diagnostic email sent directly from the KK Closet Cloudflare Worker using fetch().",
        }),
      }
    );

    const rawBody = await response.text();

    const headers = {};

    for (const [key, value] of response.headers.entries()) {
      headers[key] = value;
    }

    console.log(
      "RESEND DIAGNOSTIC STATUS:",
      response.status
    );

    console.log(
      "RESEND DIAGNOSTIC HEADERS:",
      JSON.stringify(headers)
    );

    console.log(
      "RESEND DIAGNOSTIC RAW BODY:",
      rawBody
    );

    return json({
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      headers,
      rawBody,
    });
  } catch (error) {
    console.error(
      "RESEND DIAGNOSTIC FETCH ERROR:",
      error
    );

    return json(
      {
        ok: false,
        fetchError:
          error instanceof Error
            ? error.message
            : String(error),
      },
      500
    );
  }
}