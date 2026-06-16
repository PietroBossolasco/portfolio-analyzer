// Helper di autenticazione lato server (Node runtime): hashing password,
// lettura della sessione dal cookie, guardia per le pagine protette.
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, verifySession, type SessionClaims } from "@/lib/jwt";

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}
export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export interface CurrentUser {
  id: string;
  email: string;
  name: string | null;
}

/** Legge l'utente dalla sessione (cookie). Null se non autenticato. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const token = cookies().get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const claims: SessionClaims | null = await verifySession(token);
  if (!claims) return null;
  return { id: claims.sub, email: claims.email, name: claims.name ?? null };
}

/** Garantisce l'autenticazione nelle pagine: altrimenti redirige a /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}
