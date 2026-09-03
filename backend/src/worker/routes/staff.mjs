import bcrypt from "bcryptjs";
import { json, readJson } from "../utils/http.mjs";
import { requireRoles } from "../utils/auth.mjs";
import { sendEmail } from "../services/email.mjs";

const enc = new TextEncoder();
const hex = (bytes) =>
  [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");

async function sha256(value) {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    enc.encode(String(value))
  );
  return hex(new Uint8Array(digest));
}

function randomToken() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return hex(bytes);
}

const staffSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  staffInviteAcceptedAt: true,
  createdAt: true,
};

function invitationHtml(user, url) {
  const roleLabel =
    user.role === "ADMIN" ? "Administrator" : "Employee";

  return `<!doctype html>
<html>
<body style="margin:0;background:#f8f5ef;font-family:Arial,sans-serif;color:#1c1915">
  <div style="max-width:620px;margin:auto;padding:32px 18px">
    <div style="background:#fff;border:1px solid #e4dbcf;border-radius:16px;overflow:hidden">
      <div style="background:#1c1915;color:#fff;text-align:center;padding:28px;font-family:Georgia,serif;font-size:26px;letter-spacing:3px">
        KK CLOSET
      </div>
      <div style="padding:32px">
        <h1 style="font-family:Georgia,serif;font-weight:500">Your KK Closet staff account</h1>
        <p>Hello ${user.name},</p>
        <p>You have been invited to join KK Closet as ${roleLabel}.</p>
        <p>Use the secure link below to create your password.</p>
        <p style="margin:28px 0">
          <a href="${url}" style="display:inline-block;background:#1c1915;color:#fff;text-decoration:none;padding:14px 22px;border-radius:8px;font-weight:700">
            Create password
          </a>
        </p>
        <p style="font-size:13px;color:#756d64">This invitation expires in 48 hours.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

async function superadminOnly(request, env) {
  return requireRoles(request, env, ["SUPERADMIN"]);
}

export async function listStaffRoute(request, context) {
  try {
    await superadminOnly(request, context.env);

    // Explicit allowlist: SUPERADMIN and CUSTOMER are never returned.
    const users = await context.prisma.user.findMany({
      where: {
        role: {
          in: ["ADMIN", "EMPLOYEE"],
        },
      },
      select: staffSelect,
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    });

    return json(users);
  } catch (error) {
    return json(
      { message: error?.message || "Unable to load staff" },
      error?.status || 500
    );
  }
}

export async function createStaffRoute(request, context) {
  try {
    await superadminOnly(request, context.env);

    const body = await readJson(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const role = String(body.role || "EMPLOYEE").toUpperCase();

    if (!name || !email || !["ADMIN", "EMPLOYEE"].includes(role)) {
      return json(
        { message: "Name, email and a valid staff role are required" },
        400
      );
    }

    const existing = await context.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      return json(
        { message: "An account already exists with this email" },
        409
      );
    }

    const rawInvite = randomToken();
    const staffInviteTokenHash = await sha256(rawInvite);

    // Account cannot be used before the invitation is accepted.
    const unusablePassword = await bcrypt.hash(randomToken(), 12);

    const user = await context.prisma.user.create({
      data: {
        name,
        email,
        password: unusablePassword,
        role,
        active: true,
        staffInviteTokenHash,
        staffInviteExpiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000),
        staffInviteAcceptedAt: null,
      },
      select: staffSelect,
    });

    const inviteUrl =
      `${context.env.ADMIN_URL || "https://admin.kkcloset.uk"}` +
      `/staff-invite?token=${encodeURIComponent(rawInvite)}`;

    if (context.env.RESEND_API_KEY) {
      context.ctx.waitUntil(
        sendEmail(context.env, {
          to: user.email,
          subject: "Your KK Closet staff account",
          html: invitationHtml(user, inviteUrl),
        }).catch((error) =>
          console.error("Staff invitation email failed:", error)
        )
      );
    }

    return json(
      {
        ...user,
        invitationQueued: Boolean(context.env.RESEND_API_KEY),
      },
      201
    );
  } catch (error) {
    console.error("Create staff failed:", error);
    return json(
      { message: error?.message || "Unable to create staff account" },
      error?.status || 500
    );
  }
}

export async function updateStaffRoute(request, context, idValue) {
  try {
    await superadminOnly(request, context.env);

    const id = Number(idValue);
    const body = await readJson(request);

    const existing = await context.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: ["ADMIN", "EMPLOYEE"],
        },
      },
    });

    if (!existing) {
      return json({ message: "Staff account not found" }, 404);
    }

    const data = {};

    if (body.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) {
        return json({ message: "Name is required" }, 400);
      }
      data.name = name;
    }

    if (body.role !== undefined) {
      const role = String(body.role || "").toUpperCase();

      if (!["ADMIN", "EMPLOYEE"].includes(role)) {
        return json(
          { message: "Role must be ADMIN or EMPLOYEE" },
          400
        );
      }

      data.role = role;
    }

    if (body.active !== undefined) {
      data.active = Boolean(body.active);
    }

    const user = await context.prisma.user.update({
      where: { id },
      data,
      select: staffSelect,
    });

    return json(user);
  } catch (error) {
    return json(
      { message: error?.message || "Unable to update staff account" },
      error?.status || 500
    );
  }
}

export async function revokeStaffAccessRoute(request, context, idValue) {
  try {
    await superadminOnly(request, context.env);

    const id = Number(idValue);

    const existing = await context.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: ["ADMIN", "EMPLOYEE"],
        },
      },
    });

    if (!existing) {
      return json({ message: "Staff account not found" }, 404);
    }

    const user = await context.prisma.user.update({
      where: { id },
      data: {
        active: false,
      },
      select: staffSelect,
    });

    return json({
      message: "Staff access removed",
      user,
    });
  } catch (error) {
    return json(
      { message: error?.message || "Unable to remove staff access" },
      error?.status || 500
    );
  }
}

export async function convertStaffToCustomerRoute(
  request,
  context,
  idValue
) {
  try {
    await superadminOnly(request, context.env);

    const id = Number(idValue);

    const existing = await context.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: ["ADMIN", "EMPLOYEE"],
        },
      },
    });

    if (!existing) {
      return json({ message: "Staff account not found" }, 404);
    }

    const user = await context.prisma.user.update({
      where: { id },
      data: {
        role: "CUSTOMER",
        active: true,
        staffInviteTokenHash: null,
        staffInviteExpiresAt: null,
        staffInviteAcceptedAt: null,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    return json({
      message: "Staff account converted to customer",
      user,
    });
  } catch (error) {
    return json(
      {
        message:
          error?.message ||
          "Unable to convert staff account to customer",
      },
      error?.status || 500
    );
  }
}

export async function resendStaffInviteRoute(
  request,
  context,
  idValue
) {
  try {
    await superadminOnly(request, context.env);

    const id = Number(idValue);

    const existing = await context.prisma.user.findFirst({
      where: {
        id,
        role: {
          in: ["ADMIN", "EMPLOYEE"],
        },
      },
    });

    if (!existing) {
      return json({ message: "Staff account not found" }, 404);
    }

    if (existing.staffInviteAcceptedAt) {
      return json(
        { message: "This staff account has already been activated" },
        409
      );
    }

    const rawInvite = randomToken();

    const updated = await context.prisma.user.update({
      where: { id },
      data: {
        staffInviteTokenHash: await sha256(rawInvite),
        staffInviteExpiresAt: new Date(
          Date.now() + 48 * 60 * 60 * 1000
        ),
      },
    });

    const inviteUrl =
      `${context.env.ADMIN_URL || "https://admin.kkcloset.uk"}` +
      `/staff-invite?token=${encodeURIComponent(rawInvite)}`;

    await sendEmail(context.env, {
      to: updated.email,
      subject: "Your KK Closet staff account",
      html: invitationHtml(updated, inviteUrl),
    });

    return json({ message: "Staff invitation resent" });
  } catch (error) {
    return json(
      { message: error?.message || "Unable to resend invitation" },
      error?.status || 500
    );
  }
}

export async function acceptStaffInviteRoute(request, context) {
  try {
    const body = await readJson(request);
    const rawToken = String(body.token || "").trim();
    const password = String(body.password || "");

    if (!rawToken || password.length < 8) {
      return json(
        {
          message:
            "A valid invitation and password of at least 8 characters are required",
        },
        400
      );
    }

    const tokenHash = await sha256(rawToken);

    const user = await context.prisma.user.findFirst({
      where: {
        staffInviteTokenHash: tokenHash,
        staffInviteAcceptedAt: null,
        staffInviteExpiresAt: {
          gt: new Date(),
        },
        active: true,
        role: {
          in: ["ADMIN", "EMPLOYEE"],
        },
      },
    });

    if (!user) {
      return json(
        { message: "This staff invitation is invalid or has expired" },
        400
      );
    }

    await context.prisma.user.update({
      where: { id: user.id },
      data: {
        password: await bcrypt.hash(password, 12),
        staffInviteAcceptedAt: new Date(),
        staffInviteTokenHash: null,
        staffInviteExpiresAt: null,
      },
    });

    return json({
      message: "Password created successfully. You can now sign in.",
    });
  } catch (error) {
    return json(
      { message: error?.message || "Unable to activate staff account" },
      error?.status || 500
    );
  }
}
