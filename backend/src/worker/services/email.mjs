import { Resend } from "resend";

function escapeText(value = "") {
  return String(value).trim();
}

function getResend(env) {
  if (!env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  return new Resend(env.RESEND_API_KEY);
}

export async function sendEmail(
  env,
  {
    to,
    subject,
    text,
    html,
  }
) {
  if (!to) {
    throw new Error("Email recipient is required");
  }

  const resend = getResend(env);

  const payload = {
    from: "KK Closet <hello@kkcloset.uk>",
    to: [String(to).trim()],
    subject: String(subject || "KK Closet"),
  };

  if (html) {
    payload.html = String(html);
  } else {
    payload.text = String(text || "KK Closet");
  }

  console.log(
    "Sending email with Resend SDK:",
    JSON.stringify({
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
    })
  );

  const result = await resend.emails.send(payload);

  if (result.error) {
    console.error(
      "Resend SDK error:",
      JSON.stringify(result.error)
    );

    throw new Error(
      `Resend email failed: ${
        result.error.message || "Unknown Resend error"
      }`
    );
  }

  console.log(
    "Resend SDK success:",
    JSON.stringify(result.data)
  );

  return result.data;
}

export function sendWelcomeEmail(env, user) {
  const name = escapeText(user?.name || "there");

  return sendEmail(env, {
    to: user.email,
    subject: "Welcome to KK Closet",
    text:
      `Hello ${name},\n\n` +
      `Your email has been verified and your KK Closet account is ready.\n\n` +
      `Thank you for joining us.\n\n` +
      `KK Closet`,
  });
}

export function sendVerificationEmail(
  env,
  user,
  verificationUrl
) {
  const name = escapeText(user?.name || "there");

  return sendEmail(env, {
    to: user.email,
    subject: "Verify your KK Closet email",
    text:
      `Hello ${name},\n\n` +
      `Please verify your email address to activate your KK Closet account.\n\n` +
      `Verify your email:\n${verificationUrl}\n\n` +
      `This verification link expires in 24 hours.\n\n` +
      `KK Closet`,
  });
}