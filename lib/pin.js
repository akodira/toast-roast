import bcrypt from "bcryptjs";

/* Table PIN — a per-sitting shared secret shown once at claim time.
 *
 * Why hashed: even though it's only 4 digits, we never store it in plaintext.
 * If the DB ever leaks, PINs shouldn't come with it. bcrypt is already a
 * dependency (used for user passwords), so we reuse it here.
 *
 * Why lockout matters: 4 digits = 10,000 combinations, brute-forceable in
 * seconds without a limit. The attempt counter + timed lock is what makes a
 * short PIN actually safe. PIN and lockout are a package — one is useless
 * without the other.
 */

export const PIN_MAX_ATTEMPTS = 5;
export const PIN_LOCK_MINUTES = 15;

// 4-digit, cryptographically random, zero-padded (so "0042" is valid).
export function generatePin() {
  // crypto is available in the Node runtime these routes run under.
  const n = require("crypto").randomInt(0, 10000);
  return String(n).padStart(4, "0");
}

export async function hashPin(pin) {
  return bcrypt.hash(String(pin), 10);
}

export async function verifyPin(pin, hash) {
  if (!hash) return false;
  return bcrypt.compare(String(pin), hash);
}

// Is this table currently locked out? Returns remaining seconds, or 0.
export function lockRemainingSeconds(pinLockedUntil) {
  if (!pinLockedUntil) return 0;
  const until = new Date(pinLockedUntil).getTime();
  const now = Date.now();
  return until > now ? Math.ceil((until - now) / 1000) : 0;
}

// Basic shape check before hitting bcrypt.
export function isPinFormat(pin) {
  return /^\d{4}$/.test(String(pin || "").trim());
}

/* Shared gate used by join + order: verify a table's PIN with lockout.
 * Pass a db handle (from getDb) so this stays free of circular imports.
 *
 * Returns { ok:true } on success (and resets the attempt counter), or
 * { ok:false, status, error } on failure — including a 429 with a retry
 * hint when the table is locked. Centralised so every caller enforces the
 * exact same rules; a route can never accidentally skip the lockout.
 */
export async function checkTablePin(db, tableId, pin) {
  if (!isPinFormat(pin)) return { ok: false, status: 400, error: "Enter the 4-digit table PIN." };

  const t = await db.prepare(
    "SELECT PinHash, PinLockedUntil FROM Tables WHERE TableId=$1 AND IsActive=true"
  ).get(tableId);
  if (!t) return { ok: false, status: 400, error: "That table isn't available." };
  if (!t.PinHash) return { ok: false, status: 400, error: "This table has no active PIN. Please register it first." };

  const locked = lockRemainingSeconds(t.PinLockedUntil);
  if (locked > 0) {
    const mins = Math.ceil(locked / 60);
    return { ok: false, status: 429, error: `Too many wrong tries. Try again in about ${mins} minute${mins === 1 ? "" : "s"}.` };
  }

  if (await verifyPin(pin, t.PinHash)) {
    // Success — clear the counter and any expired lock.
    await db.prepare("UPDATE Tables SET PinAttempts=0, PinLockedUntil=NULL WHERE TableId=$1").run(tableId);
    return { ok: true };
  }

  // Wrong PIN — increment, and lock once the ceiling is hit.
  const r = await db.prepare(
    `UPDATE Tables SET PinAttempts = PinAttempts + 1,
       PinLockedUntil = CASE WHEN PinAttempts + 1 >= $2
         THEN NOW() + ($3 || ' minutes')::interval ELSE PinLockedUntil END
     WHERE TableId=$1 RETURNING PinAttempts AS n`
  ).get(tableId, PIN_MAX_ATTEMPTS, String(PIN_LOCK_MINUTES));
  const left = Math.max(0, PIN_MAX_ATTEMPTS - (r?.n || 0));
  return {
    ok: false, status: 403,
    error: left > 0
      ? `Incorrect PIN. ${left} attempt${left === 1 ? "" : "s"} left.`
      : `Too many wrong tries. Locked for ${PIN_LOCK_MINUTES} minutes.`,
  };
}
