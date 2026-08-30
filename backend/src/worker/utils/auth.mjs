import { verifyJwt } from "./jwt.mjs";

export async function getAuthenticatedUser(request, env) {
  const header = request.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7).trim() : "";

  if (!token) {
    throw Object.assign(new Error("No token provided"), { status: 401 });
  }

  return verifyJwt(token, env.JWT_SECRET);
}

export async function requireRoles(request, env, roles) {
  const user = await getAuthenticatedUser(request, env);

  if (!roles.includes(user.role)) {
    throw Object.assign(new Error("Access denied"), { status: 403 });
  }

  return user;
}

export async function requireAdmin(request, env) {
  return requireRoles(request, env, ["SUPERADMIN", "ADMIN"]);
}
