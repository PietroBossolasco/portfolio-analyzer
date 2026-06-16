import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/auth";
import { decrypt, blindIndex } from "@/lib/crypto";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    const mail = String(email ?? "").trim().toLowerCase();
    const pw = String(password ?? "");

    const user = await prisma.user.findUnique({ where: { emailHash: blindIndex(mail) } });
    // messaggio generico per non rivelare se l'email esiste
    const invalid = NextResponse.json({ error: "Email o password non corretti." }, { status: 401 });
    if (!user) return invalid;
    if (!(await verifyPassword(pw, user.passwordHash))) return invalid;

    const name = decrypt(user.name);
    const token = await signSession({ sub: user.id, email: mail, name });
    const res = NextResponse.json({ ok: true, user: { email: mail, name } });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ error: `Errore interno: ${e?.message ?? e}` }, { status: 500 });
  }
}
