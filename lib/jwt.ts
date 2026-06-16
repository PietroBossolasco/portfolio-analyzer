// Firma/verifica dei token di sessione (JWT, HS256). Usa solo `jose`, quindi è
// utilizzabile anche nel middleware (runtime edge).
import { SignJWT, jwtVerify } from "jose";

export interface SessionClaims {
  sub: string; // userId
  email: string;
  name?: string | null;
}

const SECRET = process.env.AUTH_SECRET ?? "insecure-dev-secret-change-me";
const key = new TextEncoder().encode(SECRET);
export const SESSION_COOKIE = "session";
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 giorni

export async function signSession(claims: SessionClaims): Promise<string> {
  return new SignJWT({ email: claims.email, name: claims.name ?? null })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(claims.sub)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(key);
}

export async function verifySession(token: string): Promise<SessionClaims | null> {
  try {
    const { payload } = await jwtVerify(token, key);
    if (!payload.sub) return null;
    return {
      sub: payload.sub,
      email: String(payload.email ?? ""),
      name: (payload.name as string | null) ?? null,
    };
  } catch {
    return null;
  }
}
