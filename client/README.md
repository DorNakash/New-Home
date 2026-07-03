# New Home — Client

React + TypeScript SPA for the New Home household furnishing tracker. Hebrew RTL UI, light/dark mode, deployed to Vercel.

## Stack

| Layer | Technology |
|---|---|
| Build | Vite + TypeScript |
| UI | React 19, TailwindCSS v4, Base UI (shadcn primitives) |
| Data fetching | TanStack React Query v5 |
| Routing | React Router v7 |
| Icons | Lucide React |
| Excel | SheetJS (`xlsx`) — import/export runs fully client-side |

## Local development

```bash
npm install
npm run dev    # Vite dev server on port 5173
```

The app expects the server running at `http://localhost:3001` by default. Override with:

```bash
VITE_API_URL=http://localhost:3001 npm run dev
```

## Environment variables

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL of the server API. Defaults to `http://localhost:3001` in dev. Must be set to the Vercel server URL in production. |

## Build

```bash
npm run build    # tsc + vite build → dist/
npm run preview  # serve dist/ locally
```

## Project structure

```
src/
  pages/           # One file per route
    LoginPage.tsx
    DashboardPage.tsx
    RoomPage.tsx         # /rooms/:roomId
    ItemPage.tsx         # /items/:itemId
    StoresPage.tsx
    ImportExportPage.tsx
  components/
    ui/              # Base UI / shadcn primitives
    items/           # ItemCard, OptionCard, StatusBadge, PriorityStars, Currency, ...
    rooms/           # RoomFormDialog
    layout/          # AppShell, ThemeToggle, ProtectedRoute
  lib/
    api.ts           # fetch wrapper — credentials:include, throws ApiError on non-2xx
    utils/
      excel.ts       # parseExcelFile, transformRows, autoMap, exportItemsToExcel
      image.ts       # imgSrc() — resolves local paths and Vercel Blob URLs
    queries/         # React Query hooks (auth, rooms, items, options, stores, categories, dashboard)
    constants/
      status.ts      # STATUS_LABELS, STATUS_COLORS, PRIORITY_LABELS
  hooks/
    useAuth.ts
```

## Routing

| Route | Page |
|---|---|
| `/login` | Login |
| `/` | Dashboard (summary cards, room breakdown, progress bar) |
| `/rooms/:roomId` | Room page (item card grid) |
| `/items/:itemId` | Item detail (info + options tabs) |
| `/stores` | Stores list |
| `/import` | Import/export Excel |

All routes except `/login` are wrapped in `ProtectedRoute` which redirects to `/login` if unauthenticated.

## Data fetching

All API calls go through `src/lib/api.ts` which:
- Prepends `VITE_API_URL`
- Sends `credentials: "include"` so the httpOnly auth cookie is forwarded
- Throws `ApiError` (with `.status`) on non-2xx responses

React Query hooks live in `src/lib/queries/*.ts`. Query keys:

```
["me"]
["rooms"]
["room", roomId]
["items-search", filters]
["item", itemId]
["dashboard-summary"]
["stores"]
["categories"]
```

After any mutation, invalidate the relevant keys. Dashboard summary must be invalidated whenever items or rooms change.

## Item status lifecycle

| Status | Hebrew | Counts as done? |
|---|---|---|
| `SEARCHING` | מחפש | — |
| `READY_TO_ORDER` | מוכן להזמנה | — |
| `ORDERED` | הוזמן | ✅ |
| `ARRIVED` | הגיע | ✅ |
| `INSTALLED` | הותקן | ✅ |
| `CANCELLED` | בוטל | excluded |

Progress % = ORDERED + ARRIVED + INSTALLED / total non-cancelled items.

## Images

Always use `imgSrc()` from `src/lib/utils/image.ts` instead of constructing image URLs manually:
- Full `https://` URL (Vercel Blob in production) → used as-is
- Relative path (local dev) → prefixed with `${VITE_API_URL}/uploads/`

## Excel import

Handled entirely client-side in `src/lib/utils/excel.ts`:
1. `parseExcelFile` — reads xlsx, filters empty rows, extracts hyperlink URLs from cells
2. `autoMap` — fuzzy-matches Hebrew/English column names to import fields
3. `transformRows` — fill-down for merged room cells, maps נקנה → ARRIVED, validates URLs

Rows are POSTed to `POST /api/import` as JSON.

## RTL

- `<html dir="rtl" lang="he">` in `index.html` — do not remove
- Use Tailwind logical properties: `ms-*`/`me-*`, `text-start`/`text-end`
- `<Currency>` wraps amounts in `<span dir="ltr">` to prevent digit reordering
- Flip directional icons with `rtl:-scale-x-100`

## Deployment

`vercel.json` rewrites all paths to `/index.html` for SPA routing. Set `VITE_API_URL` in the Vercel project environment variables pointing to the deployed server URL.
