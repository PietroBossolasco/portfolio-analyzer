// GET /api/account/export?format=csv|json — esporta i dati dell'utente.
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getTransactions, getDashboardData } from "@/lib/data";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function csvCell(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

  const format = req.nextUrl.searchParams.get("format") ?? "csv";
  const txs = await getTransactions(user.id);
  const stamp = new Date().toISOString().slice(0, 10);

  if (format === "json") {
    const dash = await getDashboardData(user.id);
    const body = JSON.stringify(
      {
        exportedAt: new Date().toISOString(),
        account: { email: user.email, name: user.name },
        statistiche: dash.stats,
        sintesiMensile: dash.months,
        posizioni: dash.positions,
        transazioni: txs,
      },
      null,
      2
    );
    return new NextResponse(body, {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="portfolio-export-${stamp}.json"`,
      },
    });
  }

  // CSV transazioni
  const cols = [
    "Data", "Tipo", "Titolo", "ISIN", "Quantità", "Prezzo", "Importo",
    "Commissioni", "Tasse", "Realizzato", "Valuta", "Descrizione",
  ];
  const lines = [cols.join(",")];
  for (const t of txs) {
    lines.push(
      [
        t.date.toISOString().slice(0, 10),
        t.tipo, t.nome, t.isin, t.shares, t.price, t.amount,
        t.fee, t.tax, t.realized, t.currency, t.description,
      ].map(csvCell).join(",")
    );
  }
  const csv = "﻿" + lines.join("\n"); // BOM per Excel

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transazioni-${stamp}.csv"`,
    },
  });
}
