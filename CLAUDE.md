# CLAUDE.md

Guida per assistenti AI (e sviluppatori) che lavorano su questo repository.
Spiega architettura, convenzioni, comandi e insidie del progetto.

## Cos'è

**Portfolio Dashboard** è un'app web **Next.js multi-utente** che analizza il
patrimonio personale a partire dagli estratti di banche/broker (oggi **Trade
Republic**). L'utente carica **PDF** (stato del portafoglio) e **CSV** (transazioni);
il parsing avviene lato server, i dati — isolati per account e **cifrati a riposo** —
sono salvati in **PostgreSQL**, e tutte le metriche derivate sono **ricalcolate a
runtime** (non persistite).

Replica e amplia dei fogli Excel di analisi: panoramica, posizioni, diversificazione
(con look-through degli ETF), valutazione "health check", ribilanciamento, registro
transazioni, calcolatore obbligazioni/ETF.

## Stack

- Next.js 14 (App Router, React 18, TypeScript), Tailwind CSS, Recharts
- PostgreSQL 16 (Docker) + Prisma 5
- Auth: JWT (`jose`) in cookie httpOnly + bcrypt
- Parsing: `pdf-parse` (PDF), `papaparse` (CSV)
- Crittografia: Node `crypto` (AES-256-GCM + HMAC-SHA256)
- API esterna opzionale: OpenFIGI (classificazione strumenti)

## Comandi

```bash
docker compose up -d     # Postgres (5432) + Adminer (8081)
npm install
npx prisma generate      # genera il client (richiede rete)
npm run db:push          # applica lo schema al DB
npm run dev              # http://localhost:3000
npm run build            # = prisma generate && next build
npx tsc --noEmit         # type-check
```

Variabili `.env` obbligatorie: `DATABASE_URL`, `AUTH_SECRET`, `ENCRYPTION_KEY`.

## Architettura e mappa dei file

```
app/
  (app)/                 area protetta (layout fa requireUser → AppShell)
    page.tsx             Panoramica · posizioni/ · diversificazione/ · valutazione/
    transazioni/ · calcolatore/ · carica/ · impostazioni/
  (auth)/                login/ · register/  (layout centrato)
  api/
    auth/                register · login · logout
    account/             password · export · profile · route(DELETE)
    upload/              import PDF/CSV (sceglie il parser per banca)
components/
  AppShell.tsx           shell responsive (sidebar desktop + drawer mobile + topbar)
  Sidebar.tsx            navigazione raggruppata + privacy toggle + account
  PageHeader.tsx         intestazione di pagina riutilizzabile
  Charts.tsx             grafici Recharts (privacy-aware)
  Breakdown.tsx          barre ordinate per ripartizioni
  Rebalance.tsx          assistente di ribilanciamento (profilo salvato su DB)
  Sensitive.tsx          wrapper per importi mascherabili (span.priv)
  PrivacyToggle.tsx / usePrivacy.ts   modalità privacy
  Kpi.tsx / TransactionsTable.tsx / AuthForm.tsx / ChangePasswordForm.tsx / ...
lib/
  prisma.ts              singleton client
  auth.ts / jwt.ts       hashing, sessione, requireUser/getCurrentUser
  crypto.ts              encrypt/decrypt (AES-256-GCM), encNum/decNum, blindIndex
  format.ts              formattazione it-IT, parseItNumber
  parsing/pdf.ts         parser estratti PDF (Trade Republic)
  parsing/csv.ts         parser transazioni CSV (Trade Republic) + normalizzazione tipi
  analytics.ts           costo medio ponderato, plus/minus, sintesi mensile, statistiche
  diversification.ts     ripartizioni + HHI/posizioni effettive + punteggio + insight
  classify.ts            look-through ISIN → aree/settori/asset class
  healthcheck.ts         valutazione su 8 dimensioni + piano d'azione
  data.ts                accesso dati: query Prisma → DECIFRA → calcola
  banks/                 architettura multi-banca (vedi sotto)
prisma/schema.prisma
middleware.ts            protegge le rotte (redirect a /login)
```

### Flusso dei dati (lettura)

Pagina server → `requireUser()` → `lib/data.ts` (`getDashboardData` /
`getTransactions`) → query Prisma filtrate per `userId` → **decifratura** dei campi
sensibili → funzioni in `analytics.ts` / `diversification.ts` / `healthcheck.ts` →
props ai componenti (i grafici sono client).

Le metriche **non** sono salvate: sempre ricalcolate dai dati grezzi decifrati.

## Modello dati (Prisma)

- **User** — `id`, `emailHash` (HMAC, univoco, per login), `email`/`name` (cifrati),
  `passwordHash` (bcrypt), `targetProfile` (ribilanciamento).
- **Snapshot** — stato da PDF: `bank`, `refDate` (chiaro), valori/liquidità/allocazione
  (cifrati). Univoco: `(userId, bank, refDate)`.
- **Position** — posizioni di uno snapshot: `sezione` (chiaro), `isin`/`nome`/`quantita`/
  prezzi/`controvalore`/`peso` (cifrati).
- **Transaction** — movimenti da CSV: PK `id` (= `transaction_id`), `bank`, `datetime`/
  `date`/`tipo`/`categoria`/`currency` (chiaro), importi/`isin`/`nome`/`description`
  (cifrati).

Tutto è in cascata sull'utente. Diagramma E/R completo nel README.

## Import PDF/CSV (`POST /api/upload`)

1. Legge il campo `bank` (default `trade-republic`); valida con `lib/banks/catalog.ts`.
2. Ottiene il parser da `lib/banks/registry.ts`.
3. Per ogni file: `.pdf` → `parser.parsePdf`, `.csv` → `parser.parseCsv`.
4. **Cifra** i campi sensibili e fa **upsert** su Postgres.

**Idempotenza (niente duplicati):** le transazioni usano `upsert` sulla chiave `id`
(UUID dell'export); gli snapshot su `(userId, bank, refDate)`. Ricaricare aggiorna,
non duplica; un export più recente aggiunge solo i movimenti nuovi.

## Multi-banca (estensibile)

Separazione metadati/implementazione:

- `lib/banks/catalog.ts` — elenco banche, **client-safe** (alimenta il selettore senza
  importare `pdf-parse`).
- `lib/banks/types.ts` — contratto `BankParser` (`parsePdf?`, `parseCsv?`).
- `lib/banks/<id>.ts` — provider della banca (es. `trade-republic.ts`).
- `lib/banks/registry.ts` — mappa `id → provider` (server).

**Aggiungere una banca:** metti `enabled: true` nel catalogo → crea
`lib/banks/<id>.ts` che implementa `BankParser` restituendo `ParsedPdf`/`ParsedTx` →
registralo in `registry.ts`. Nient'altro cambia.

> Importante: NON importare `lib/banks/registry.ts` o i parser in componenti client
> (trascinerebbero `pdf-parse` nel bundle). Per la UI usare solo `catalog.ts`.

## Sicurezza

- Password: solo hash **bcrypt**.
- Sessione: JWT HS256 (`AUTH_SECRET`) in cookie httpOnly; verifica nel `middleware.ts`
  (edge-safe, usa solo `jose`).
- **Cifratura a riposo** (`lib/crypto.ts`): AES-256-GCM con IV casuale + auth tag per
  valore; chiave derivata da `ENCRYPTION_KEY` via SHA-256. In chiaro restano solo i
  campi non sensibili necessari a query/ordinamento (date, tipo, valuta, categoria,
  sezione, bank).
- Email cifrata + **blind index** HMAC (`emailHash`) per il lookup di login.

## Modalità privacy (maschera importi)

- Toggle in sidebar (`PrivacyToggle`) → imposta `html[data-privacy="on"]`, persistito
  in localStorage, applicato pre-paint da uno script in `app/layout.tsx`.
- Importi avvolti in `Sensitive`/`span.priv` → sfocati via CSS (reveal on hover).
- I **grafici SVG** (Recharts) non ricevono il blur CSS: usano `useHideAmounts()`
  (evento `privacychange`) per mascherare assi e tooltip in €. Le percentuali restano.

## Convenzioni

- UI e contenuti in **italiano**; codice/identificatori in inglese.
- Formattazione numeri/valute via `lib/format.ts` (locale it-IT); importi sensibili
  sempre avvolti in `Sensitive`/`.priv`.
- Pagine dati: Server Components con `export const dynamic = "force-dynamic"` +
  `requireUser()`; interattività in Client Components dedicati.
- Header pagina: usare `PageHeader`. Sidebar: navigazione raggruppata in `Sidebar.tsx`.
- Niente segreti nel client; logica DB/crypto/parsing solo lato server.

## Insidie note (gotcha)

- **Dopo ogni modifica a `schema.prisma`**: esegui `npx prisma generate` **e**
  `npm run db:push`. Finché il client non è rigenerato, `tsc` mostra errori "fantasma"
  (campi mancanti, tipi `number` vs `string` sui campi cifrati): sono solo client stale.
- **`ENCRYPTION_KEY` e `AUTH_SECRET` non vanno mai cambiati** dopo il primo uso:
  i dati cifrati e le sessioni diventerebbero illeggibili.
- I campi cifrati sono colonne `String` (base64); non sono ricercabili/ordinabili — per
  questo date/tipo/ecc. restano in chiaro.
- `pdf-parse` è in `serverComponentsExternalPackages` (next.config) e va importato come
  `pdf-parse/lib/pdf-parse.js` per evitare il codice di debug del wrapper.
- `next/font` scarica i font in fase di build: serve rete durante `next build`.
- Adminer è esposto su **8081** (vedi `docker-compose.yml`).

## Stato / roadmap

Attivo: Trade Republic (PDF+CSV). Predisposte come "in arrivo" nel catalogo: Fineco,
Directa, DEGIRO, Scalable Capital. Possibili estensioni: modalità scura, report PDF
stampabile, multi-valuta, storicizzazione del valore di mercato su più snapshot.
