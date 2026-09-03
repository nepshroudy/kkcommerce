import bcrypt from "bcryptjs";
import { sendEmail } from "../services/email.mjs";
import { readJson, json } from "../utils/http.mjs";

const RESET_EXPIRY_MINUTES = 45;

function bytesToHex(bytes) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

async function hashToken(token) {
  const data = new TextEncoder().encode(token);

  const digest = await crypto.subtle.digest(
    "SHA-256",
    data
  );

  return bytesToHex(new Uint8Array(digest));
}

function resetBaseUrl(user, env) {
  const role = String(user.role || "").toUpperCase();

  if (role === "ADMIN" || role === "SUPERADMIN") {
    return (
      env.ADMIN_URL ||
      "https://admin.kkcloset.uk"
    );
  }

  return (
    env.SHOP_URL ||
    "https://shop.kkcloset.uk"
  );
}

export async function forgotPasswordRoute(
  request,
  context
) {
  const genericResponse = {
    message:
      "If an account exists for that email, a password reset link has been sent.",
  };

  try {
    const body = await readJson(request);

    const email = String(
      body?.email || ""
    )
      .trim()
      .toLowerCase();

    if (!email) {
      return json(genericResponse);
    }

    const user =
      await context.prisma.user.findUnique({
        where: {
          email,
        },
      });

    // Never reveal whether an account exists.
    if (!user) {
      return json(genericResponse);
    }

    const rawToken = randomToken();
    const tokenHash =
      await hashToken(rawToken);

    const expiresAt = new Date(
      Date.now() +
        RESET_EXPIRY_MINUTES *
          60 *
          1000
    );

    // Invalidate previous unused reset tokens.
    await context.prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
      },
      data: {
        usedAt: new Date(),
      },
    });

    await context.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
      },
    });

    const resetUrl =
      `${resetBaseUrl(user, context.env)}` +
      `/reset-password?token=${encodeURIComponent(
        rawToken
      )}`;

    try {
      const emailPromise = sendEmail(
        context.env,
        {
          to: user.email,
          subject:
            "Reset your KK Closet password",
          text:
            `Hello ${user.name || "there"},\n\n` +
            `We received a request to reset your KK Closet password.\n\n` +
            `Reset your password using this link:\n${resetUrl}\n\n` +
            `This link expires in ${RESET_EXPIRY_MINUTES} minutes and can only be used once.\n\n` +
            `If you did not request this password reset, you can ignore this email.\n\n` +
            `KK Closet`,
        }
      );

      if (context.ctx?.waitUntil) {
        context.ctx.waitUntil(
          emailPromise.catch((error) => {
            console.error(
              "Password reset email failed:",
              error
            );
          })
        );
      } else {
        await emailPromise;
      }
    } catch (error) {
      // Don't expose email delivery failures to the requester.
      console.error(
        "Password reset email scheduling failed:",
        error
      );
    }

    return json(genericResponse);
  } catch (error) {
    console.error(
      "Forgot password failed:",
      error
    );

    // Keep response generic.
    return json(genericResponse);
  }
}

export async function resetPasswordRoute(
  request,
  context
) {
  try {
    const body = await readJson(request);

    const token = String(
      body?.token || ""
    ).trim();

    const password = String(
      body?.password || ""
    );

    if (!token || !password) {
      return json(
        {
          message:
            "Reset token and new password are required.",
        },
        400
      );
    }

    if (password.length < 8) {
      return json(
        {
          message:
            "Password must be at least 8 characters.",
        },
        400
      );
    }

    const tokenHash =
      await hashToken(token);

    const resetToken =
      await context.prisma.passwordResetToken.findUnique({
        where: {
          tokenHash,
        },
        include: {
          user: true,
        },
      });

    if (
      !resetToken ||
      resetToken.usedAt ||
      resetToken.expiresAt <= new Date()
    ) {
      return json(
        {
          message:
            "This password reset link is invalid or has expired.",
          code: "INVALID_RESET_TOKEN",
        },
        400
      );
    }

    const passwordHash =
      await bcrypt.hash(password, 12);

    const now = new Date();

    // Password update + token invalidation happen together.
    await context.prisma.$transaction([
      context.prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          password: passwordHash,
        },
      }),

      context.prisma.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          usedAt: null,
        },
        data: {
          usedAt: now,
        },
      }),
    ]);

    return json({
      message:
        "Your password has been reset successfully. You can now sign in.",
    });
  } catch (error) {
    console.error(
      "Reset password failed:",
      error
    );

    return json(
      {
        message:
          "Unable to reset password. Please try again.",
      },
      500
    );
  }
}