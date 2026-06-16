// PUT /api/account/profile — salva il profilo di ribilanciamento dell'utente.
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export const runtime = "nodejs";

const ALLOWED = ["Prudente", "Bilanciato", "Dinamico"];

export async function PUT(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const { profile } = await req.json();
  if (!ALLOWED.includes(String(profile))) {
    return NextResponse.json({ error: "Profilo non valido." }, { status: 400 });
  }

  await prisma.user.update({ where: { id: user.id }, data: { targetProfile: String(profile) } });
  return NextResponse.json({ ok: true, profile });
}
