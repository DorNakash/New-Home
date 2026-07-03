# New Home — Server

Express + TypeScript REST API for the New Home household furnishing tracker. Backed by Neon Postgres (serverless WebSocket driver) and deployed as a Vercel serverless function.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20, TypeScript (NodeNext modules) |
| Framework | Express 5 |
| Database | Neon Postgres via `@neondatabase/serverless` (WebSocket transport) |
| Auth | JWT in httpOnly cookie (`bcryptjs` for password hashing) |
| File uploads | Multer (memory storage) → local disk in dev, Vercel Blob in production |
| Deployment | Vercel serverless (`@vercel/node`) |

## Local development

```bash
cp .env.example .env   # fill in DATABASE_URL and JWT_SECRET
npm install
npm run migrate        # apply schema.sql to Neon
npm run seed           # create household + 2 users
npm run dev            # tsx watch on port 3001
```

The dev server hot-reloads via `tsx watch`. Uploaded images are written to `uploads/` (gitignored).

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | ✅ | Neon pooled connection string |
| `JWT_SECRET` | ✅ | Secret for signing session JWTs — use a long random string in production |
| `CLIENT_ORIGIN` | ✅ | Full URL of the client app (sets CORS `Access-Control-Allow-Origin`) |
| `NODE_ENV` | ✅ in prod | Set to `production` on Vercel |
| `BLOB_READ_WRITE_TOKEN` | ✅ in prod | Vercel Blob token — enables cloud image storage |
| `PORT` | optional | Local dev port, defaults to `3001` |
| `SEED_USER_1_USERNAME` / `_PASSWORD` / `_NAME` | seed only | Credentials for user 1 |
| `SEED_USER_2_USERNAME` / `_PASSWORD` / `_NAME` | seed only | Credentials for user 2 |

## Scripts

```bash
npm run dev       # start with hot reload (tsx watch)
npm run build     # compile TypeScript → dist/
npm run start     # run compiled dist/index.js
npm run migrate   # apply src/db/schema.sql (idempotent)
npm run seed      # create household + 2 users (idempotent)
```

## API routes

All routes except `/api/auth/*` require a valid session cookie (`requireAuth` middleware).

### Auth
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login with username + password, sets httpOnly cookie |
| `POST` | `/api/auth/logout` | Clear session cookie |
| `GET` | `/api/auth/me` | Return current user (used on app boot) |

### Rooms
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/rooms` | List all rooms |
| `POST` | `/api/rooms` | Create room |
| `GET` | `/api/rooms/:id` | Room detail + all items |
| `PATCH` | `/api/rooms/:id` | Update name/icon |
| `DELETE` | `/api/rooms/:id` | Delete room and all its items |

### Items
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/items` | Search/filter items (q, status, room_id, category_id, priority, store_id) |
| `POST` | `/api/items` | Create item |
| `GET` | `/api/items/:id` | Item detail + options |
| `PATCH` | `/api/items/:id` | Update any writable field |
| `DELETE` | `/api/items/:id` | Delete item |
| `POST` | `/api/items/:id/fetch-image` | Auto-fetch og:image from product URL (or download a supplied image URL) |

### Options (purchase alternatives per item)
| Method | Path | Description |
|---|---|---|
| `POST` | `/api/items/:itemId/options` | Add option to item |
| `PATCH` | `/api/options/:id` | Update option |
| `DELETE` | `/api/options/:id` | Delete option |
| `POST` | `/api/options/:id/select` | Select option → syncs price/store to parent item atomically |
| `POST` | `/api/options/:id/fetch-image` | Same as item fetch-image but for an option |

### Dashboard
| Method | Path | Description |
|---|---|---|
| `GET` | `/api/dashboard/summary` | Totals, per-room breakdown, completion % |

### Stores / Categories / Household / Upload / Import
| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/stores` | List / create stores |
| `GET/POST` | `/api/categories` | List / create categories |
| `GET/PATCH` | `/api/household` | Get / update household (name, budget) |
| `POST` | `/api/upload` | Upload image file for an item (multipart/form-data, field `file` + `itemId`) |
| `POST` | `/api/import` | Bulk import items from Excel (parsed client-side, POSTed as JSON) |
| `DELETE` | `/api/import` | Delete all items for this household |

## Database

Schema lives in `src/db/schema.sql` — idempotent (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`). Run `npm run migrate` to apply.

**Tables:** `households` → `users`, `rooms`, `categories`, `stores` → `items` → `item_options`

Every query is scoped to `household_id` derived from the JWT — never from client input.

The `@neondatabase/serverless` driver uses a WebSocket connection (port 443) instead of the standard Postgres wire protocol (port 5432), which works through restrictive network environments and Vercel's serverless runtime.

## Image storage

`src/storage.ts` has two backends selected at runtime:

- **Dev** (`BLOB_READ_WRITE_TOKEN` not set): writes to `uploads/{householdId}/{itemId}/{uuid}.ext`, served via Express static
- **Production** (`BLOB_READ_WRITE_TOKEN` set): uploads to Vercel Blob, returns a public `https://` CDN URL stored directly in `image_path`

The returned value from `saveImage()` is always what goes into the DB's `image_path` column.

## Auth design

Two known users share one household. No signup flow — users are created once via `npm run seed`.

- Login sets an httpOnly cookie (`session`) containing a signed JWT (`userId`, `householdId`)
- `sameSite: "none"` + `secure: true` in production (required for cross-origin between client and server Vercel domains)
- `sameSite: "lax"` in dev (same-origin localhost)
- `requireAuth` middleware verifies the JWT and attaches `req.user` to every protected request
