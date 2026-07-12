import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export const ROLE_ADMIN = 1;
export const ROLE_STAFF = 2;
export const ROLE_EDITOR = 3;
export const ROLE_NAMES = { [ROLE_ADMIN]: "Admin", [ROLE_STAFF]: "Staff", [ROLE_EDITOR]: "Editor" };

export async function createSession(user, roleIds) {
  return await new SignJWT({ sub: String(user.UserId), username: user.Username, roles: roleIds })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("8h").sign(secret());
}

export async function verifyToken(token) {
  try { const { payload } = await jwtVerify(token, secret()); return payload; }
  catch { return null; }
}

export async function getSession() {
  const token = cookies().get("tr_session")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function requireAdmin() {
  const s = await getSession();
  if (!s) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  return s;
}

// Returns the array of role IDs on this session — handles both the new
// multi-role token shape ({roles: [1,3]}) and old single-role tokens
// ({role: 1}) still valid from before a user's next login.
export function sessionRoles(s) {
  if (Array.isArray(s.roles)) return s.roles.map(Number);
  if (s.role != null) return [Number(s.role)];
  return [];
}

// Returns the session if any of its roles is in allowedRoles, otherwise null.
// Role checks always happen server-side in the API route itself — hiding a
// nav link in the UI is not a security boundary on its own.
export async function requireRole(allowedRoles) {
  const s = await getSession();
  if (!s || !sessionRoles(s).some(r => allowedRoles.includes(r))) return null;
  return s;
}
