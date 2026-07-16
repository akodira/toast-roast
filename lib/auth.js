import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || "dev-secret-change-me");

export const ROLE_ADMIN = 1;
export const ROLE_STAFF = 2;
export const ROLE_EDITOR = 3;
export const ROLE_MANAGER = 4;
export const ROLE_NAMES = { [ROLE_ADMIN]: "Admin", [ROLE_STAFF]: "Staff", [ROLE_EDITOR]: "Editor", [ROLE_MANAGER]: "Manager" };

// Back-office sections and which roles grant them BY DEFAULT (the preset).
// Per-user overrides (grants/revokes) are layered on top of these — see
// resolveSections below. Admin always has every section, and can never be
// locked out of Users (so there's always a way back in).
export const SECTIONS = [
  { key: "dashboard", label: "Dashboard", roles: [ROLE_ADMIN, ROLE_MANAGER] },
  { key: "orders", label: "Orders", roles: [ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER] },
  { key: "invoices", label: "Invoices", roles: [ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER] },
  { key: "tables", label: "Tables", roles: [ROLE_ADMIN, ROLE_STAFF, ROLE_MANAGER] },
  { key: "menu", label: "Menu Items", roles: [ROLE_ADMIN, ROLE_EDITOR] },
  { key: "categories", label: "Categories", roles: [ROLE_ADMIN, ROLE_EDITOR] },
  { key: "content", label: "Website Content", roles: [ROLE_ADMIN] },
  { key: "settings", label: "Tax & Service", roles: [ROLE_ADMIN] },
  { key: "users", label: "Users", roles: [ROLE_ADMIN] },
];
export const SECTION_KEYS = SECTIONS.map(s => s.key);

// Which sections a set of roles grants by default (no overrides applied).
export function defaultSectionsForRoles(roleIds) {
  const ids = roleIds.map(Number);
  return SECTIONS.filter(sec => sec.roles.some(r => ids.includes(r))).map(s => s.key);
}

// Final section access = role defaults, plus per-user grants, minus per-user
// revokes. Admin always keeps everything. `overrides` is { section: bool }.
export function resolveSections(roleIds, overrides = {}) {
  const ids = roleIds.map(Number);
  if (ids.includes(ROLE_ADMIN)) return [...SECTION_KEYS]; // admin = all, always
  const set = new Set(defaultSectionsForRoles(ids));
  for (const [key, allowed] of Object.entries(overrides || {})) {
    if (!SECTION_KEYS.includes(key)) continue;
    if (allowed) set.add(key); else set.delete(key);
  }
  return SECTION_KEYS.filter(k => set.has(k));
}

export async function createSession(user, roleIds, overrides = {}) {
  const sections = resolveSections(roleIds, overrides);
  return await new SignJWT({ sub: String(user.UserId), username: user.Username, roles: roleIds, sections })
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

// The sections this session may access. Prefer the token's baked-in list;
// fall back to role defaults for older tokens issued before per-section
// overrides existed (still valid until the user's next login).
export function sessionSections(s) {
  if (Array.isArray(s.sections)) return s.sections;
  return defaultSectionsForRoles(sessionRoles(s));
}

// Server-side section gate — the real boundary for a back-office section.
// Returns the session if allowed, else null.
export async function requireSection(sectionKey) {
  const s = await getSession();
  if (!s) return null;
  if (sessionRoles(s).includes(ROLE_ADMIN)) return s; // admin = all
  return sessionSections(s).includes(sectionKey) ? s : null;
}
