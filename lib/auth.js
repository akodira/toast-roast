import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export const ROLE_ADMIN = 1;
export const ROLE_STAFF = 2;
export const ROLE_EDITOR = 3;
export const ROLE_NAMES = { [ROLE_ADMIN]: "Admin", [ROLE_STAFF]: "Staff", [ROLE_EDITOR]: "Editor" };

export async function createSession(user) {
  return await new SignJWT({ sub: String(user.UserId), username: user.Username, role: user.RoleId })
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

// Returns the session if its role is in allowedRoles, otherwise null.
// Role checks always happen server-side in the API route itself — hiding a
// nav link in the UI is not a security boundary on its own.
export async function requireRole(allowedRoles) {
  const s = await getSession();
  if (!s || !allowedRoles.includes(Number(s.role))) return null;
  return s;
}
