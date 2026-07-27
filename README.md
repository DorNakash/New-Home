# New Home

A Hebrew RTL household furnishing tracker for two users. Plan, track, and manage everything you need to buy for a new home — rooms, items, purchase options, budget, and progress.

## Monorepo structure

| Directory | Description |
|---|---|
| [`client/`](client/) | React + TypeScript SPA (Vite, TailwindCSS, React Query) |
| [`server/`](server/) | Express 5 + TypeScript REST API (Neon Postgres, Vercel serverless) |

Both are deployed independently to Vercel. See each directory's README for setup and local development instructions.

## Features

- **Rooms & items** — organise purchases by room, set priority, status, and quantity
- **Purchase options** — attach multiple shopping alternatives per item; selecting one syncs the price automatically
- **Budget tracking** — per-room and household-wide budget bars; planned vs. actual price per item
- **Household costs** — global delivery and installation cost totals editable from the dashboard and included in "paid so far"
- **Dashboard** — overall progress bar, summary cards (budget, paid, savings, delivery, installation), per-room breakdowns
- **Image auto-fetch** — extracts og:image from a product URL automatically; manual URL fallback
- **Excel import/export** — full client-side xlsx import with Hebrew column auto-mapping and fill-down room merge support
- **Dark / light mode** — system preference aware, toggle in the header
- **Hebrew RTL** — all UI, labels, and errors in Hebrew; Tailwind logical properties throughout

## Quick start

```bash
# Server
cd server
cp .env.example .env   # fill in DATABASE_URL, JWT_SECRET, CLIENT_ORIGIN
npm install
npm run migrate
npm run seed
npm run dev            # port 3001

# Client (separate terminal)
cd client
npm install
npm run dev            # port 5173
```
