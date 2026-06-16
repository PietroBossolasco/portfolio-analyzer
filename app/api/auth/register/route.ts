import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { encrypt, blindIndex } from "@/lib/crypto";
import { signSession, SESSION_COOKIE, SESSION_MAX_AGE } from "@/lib/jwt";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json();
    const mail = String(email ?? "").trim().toLowerCase();
    const pw = String(password ?? "");

    if (!mail || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail)) {
      return NextResponse.json({ error: "Email non valida." }, { status: 400 });
    }
    if (pw.length < 8) {
      return NextResponse.json({ error: "La password deve avere almeno 8 caratteri." }, { status: 400 });
    }

    const emailHash = blindIndex(mail);
    const existing = await prisma.user.findUnique({ where: { emailHash } });
    if (existing) {
      return NextResponse.json({ error: "Esiste già un account con questa email." }, { status: 409 });
    }

    const cleanName = name ? String(name).trim() : null;
    const user = await prisma.user.create({
      data: {
        emailHash,
        email: encrypt(mail)!,
        name: encrypt(cleanName),
        passwordHash: await hashPassword(pw),
      },
    });

    // i claim della sessione contengono i valori in chiaro (token firmato lato server)
    const token = await signSession({ sub: user.id, email: mail, name: cleanName });
    const res = NextResponse.json({ ok: true, user: { email: mail, name: cleanName } });
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
