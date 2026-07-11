import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

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
