import { createHmac, randomBytes, pbkdf2Sync, timingSafeEqual } from "crypto";

const SECRET = process.env.ADMIN_SECRET ?? "admin-secret-token";

// ─── Password ────────────────────────────────────────────────────────
export function hashPassword(plain: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = pbkdf2Sync(plain, salt, 100_000, 64, "sha512").toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  try {
    const [salt, hash] = stored.split(":");
    const attempt = pbkdf2Sync(plain, salt, 100_000, 64, "sha512").toString("hex");
    return timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(attempt, "hex"));
  } catch { return false; }
}

// ─── JWT (HS256, no external dep) ────────────────────────────────────
function b64url(s: string) {
  return Buffer.from(s).toString("base64url");
}

export function signJWT(payload: Record<string, unknown>, expiresInSeconds = 60 * 60 * 24 * 30): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body   = b64url(JSON.stringify({ ...payload, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + expiresInSeconds }));
  const sig    = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJWT(token: string): Record<string, unknown> | null {
  try {
    const [header, body, sig] = token.split(".");
    const expected = createHmac("sha256", SECRET).update(`${header}.${body}`).digest("base64url");
    if (!timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch { return null; }
}

// ─── Request auth helper ─────────────────────────────────────────────
export type AdminRole = "admin" | "moderateur";

export interface AuthResult {
  valid: boolean;
  role: AdminRole;
  userId?: string;
  username?: string;
  isLegacy?: boolean; // authenticated via ADMIN_SECRET directly
}

export function checkAuth(token: string | null): AuthResult {
  if (!token) return { valid: false, role: "moderateur" };

  // Legacy: raw ADMIN_SECRET token (full admin rights)
  if (token === SECRET) {
    return { valid: true, role: "admin", isLegacy: true };
  }

  // JWT token from AdminUser login
  const payload = verifyJWT(token);
  if (!payload) return { valid: false, role: "moderateur" };

  return {
    valid: true,
    role: (payload.role as AdminRole) ?? "moderateur",
    userId: payload.id as string,
    username: payload.username as string,
  };
}

export function requireAdmin(token: string | null): boolean {
  const auth = checkAuth(token);
  return auth.valid && auth.role === "admin";
}
