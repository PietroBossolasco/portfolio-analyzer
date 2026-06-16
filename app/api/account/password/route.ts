import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, verifyPassword, hashPassword } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { currentPassword, newPassword } = await req.json();
  if (String(newPassword ?? "").length < 8) {
    return NextResponse.json({ error: "La nuova password deve avere almeno 8 caratteri." }, { status: 400 });
  }

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return NextResponse.json({ error: "Utente non trovato." }, { status: 404 });

  if (!(await verifyPassword(String(currentPassword ?? ""), dbUser.passwordHash))) {
    return NextResponse.json({ error: "La password attuale non è corretta." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await hashPassword(String(newPassword)) },
  });
  return NextResponse.json({ ok: true });
}
