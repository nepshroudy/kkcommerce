import bcrypt from "bcryptjs";
import { readJson, json } from "../utils/http.mjs";
import { signJwt } from "../utils/jwt.mjs";
import { getAuthenticatedUser } from "../utils/auth.mjs";

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

async function createToken(user, env) {
  return signJwt(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      name: user.name,
    },
    env.JWT_SECRET
  );
}

export async function registerRoute(request, context) {
  try {
    const body = await readJson(request);
    const name = String(body.name || "").trim();
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!name || !email || !password) {
      return json(
        { message: "Name, email and password are required" },
        400
      );
    }

    if (password.length < 6) {
      return json(
        { message: "Password must be at least 6 characters" },
        400
      );
    }

    const exists = await context.prisma.user.findUnique({
      where: { email },
    });

    if (exists) {
      return json({ message: "Email already registered" }, 409);
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await context.prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: "CUSTOMER",
      },
    });

    const token = await createToken(user, context.env);

    return json(
      {
        token,
        user: publicUser(user),
      },
      201
    );
  } catch (error) {
    console.error("Register failed:", error);
    return json(
      { message: error?.message || "Register failed" },
      error?.status || 500
    );
  }
}

export async function loginRoute(request, context) {
  try {
    const body = await readJson(request);
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (!email || !password) {
      return json({ message: "Email and password are required" }, 400);
    }

    const user = await context.prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return json({ message: "Invalid credentials" }, 401);
    }

    const matches = await bcrypt.compare(password, user.password);

    if (!matches) {
      return json({ message: "Invalid credentials" }, 401);
    }

    const token = await createToken(user, context.env);

    return json({
      token,
      user: publicUser(user),
    });
  } catch (error) {
    console.error("Login failed:", error);
    return json(
      { message: error?.message || "Login failed" },
      error?.status || 500
    );
  }
}

export async function meRoute(request, context) {
  try {
    const user = await getAuthenticatedUser(request, context.env);
    return json({ user });
  } catch (error) {
    return json(
      { message: error?.message || "Authentication failed" },
      error?.status || 401
    );
  }
}
