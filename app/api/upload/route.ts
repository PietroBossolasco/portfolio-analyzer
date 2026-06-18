// POST /api/upload — riceve PDF e/o CSV, sceglie il parser in base alla banca
// selezionata, li interpreta lato server e popola Postgres (dati cifrati).
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { encrypt, encNum } from "@/lib/crypto";
import { getBankInfo, DEFAULT_BANK } from "@/lib/banks/catalog";
import { getParser } from "@/lib/banks/registry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });

    const form = await req.formData();
    const bank = String(form.get("bank") || DEFAULT_BANK);
    const info = getBankInfo(bank);
    if (!info || !info.enabled) {
      return NextResponse.json({ error: "Banca non supportata o non ancora disponibile." }, { status: 400 });
    }
    const parser = getParser(bank);
    if (!parser) {
      return NextResponse.json({ error: "Parser non disponibile per questa banca." }, { status: 400 });
    }

    const files = form.getAll("files").filter((f): f is File => f instanceof File);
    if (files.length === 0) {
      return NextResponse.json({ error: "Nessun file ricevuto." }, { status: 400 });
    }

    let pdfCount = 0;
    let positionCount = 0;
    let txCount = 0;
    const errors: string[] = [];

    for (const file of files) {
      const name = file.name.toLowerCase();
      const buf = Buffer.from(await file.arrayBuffer());

      if (name.endsWith(".pdf")) {
        if (!parser.parsePdf) {
          errors.push(`${file.name}: ${info.label} non supporta l'import PDF.`);
          continue;
        }
        try {
          const parsed = await parser.parsePdf(buf, file.name);
          if (!parsed.refDate) {
            errors.push(`${file.name}: data di riferimento non trovata, saltato.`);
            continue;
          }
          const snap = await prisma.snapshot.upsert({
            where: { userId_bank_refDate: { userId: user.id, bank, refDate: parsed.refDate } },
            create: {
              userId: user.id,
              bank,
              refDate: parsed.refDate,
              fileName: encrypt(file.name),
              totalValue: encNum(parsed.totalValue),
              liquidity: encNum(parsed.liquidity),
              allocConto: encNum(parsed.allocConto),
              allocPrivate: encNum(parsed.allocPrivate),
              allocReddito: encNum(parsed.allocReddito),
            },
            update: {
              fileName: encrypt(file.name),
              totalValue: encNum(parsed.totalValue),
              liquidity: encNum(parsed.liquidity),
              allocConto: encNum(parsed.allocConto),
              allocPrivate: encNum(parsed.allocPrivate),
              allocReddito: encNum(parsed.allocReddito),
            },
          });
          await prisma.position.deleteMany({ where: { snapshotId: snap.id } });
          if (parsed.positions.length) {
            await prisma.position.createMany({
              data: parsed.positions.map((p) => ({
                snapshotId: snap.id,
                sezione: p.sezione,
                isin: encrypt(p.isin)!,
                nome: encrypt(p.nome)!,
                quantita: encNum(p.quantita),
                prezzoMercato: encNum(p.prezzoMercato),
                controvalore: encNum(p.controvalore),
                peso: encNum(p.peso),
              })),
            });
          }
          pdfCount++;
          positionCount += parsed.positions.length;
        } catch (e: any) {
          errors.push(`${file.name}: errore parsing PDF (${e?.message ?? e}).`);
        }
      } else if (name.endsWith(".csv")) {
        if (!parser.parseCsv) {
          errors.push(`${file.name}: ${info.label} non supporta l'import CSV.`);
          continue;
        }
        try {
          const text = buf.toString("utf8");
          const txs = parser.parseCsv(text);
          for (const t of txs) {
            const data = {
              id: t.id,
              userId: user.id,
              bank,
              datetime: t.datetime,
              date: t.date,
              tipo: t.tipo,
              tipoRaw: t.tipoRaw,
              categoria: t.categoria,
              assetClass: t.assetClass,
              currency: t.currency,
              nome: encrypt(t.nome),
              isin: encrypt(t.isin),
              shares: encNum(t.shares),
              price: encNum(t.price),
              amount: encNum(t.amount),
              fee: encNum(t.fee),
              tax: encNum(t.tax),
              description: encrypt(t.description),
            };
            await prisma.transaction.upsert({ where: { id: t.id }, create: data, update: data });
          }
          txCount += txs.length;
        } catch (e: any) {
          errors.push(`${file.name}: errore parsing CSV (${e?.message ?? e}).`);
        }
      } else {
        errors.push(`${file.name}: formato non supportato (servono .pdf o .csv).`);
      }
    }

    return NextResponse.json({ ok: true, bank, pdfCount, positionCount, txCount, errors });
  } catch (e: any) {
    return NextResponse.json({ error: `Errore interno: ${e?.message ?? e}` }, { status: 500 });
  }
}

// DELETE /api/upload — svuota i dati dell'utente corrente
export async function DELETE() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Non autenticato." }, { status: 401 });
  await prisma.snapshot.deleteMany({ where: { userId: user.id } });
  await prisma.transaction.deleteMany({ where: { userId: user.id } });
  return NextResponse.json({ ok: true });
}
