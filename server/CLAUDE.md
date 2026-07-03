# Server — Claude guidance

## What this is

Express 5 + TypeScript REST API for a 2-user Hebrew household furnishing tracker. Deployed as a Vercel serverless function. The client is a separate repo at `../client/`.

## Database — raw SQL only, no ORM

Queries go through three helpers in `src/db/index.ts`:

```typescript
query<T>(sql, params)        // → T[]
queryOne<T>(sql, params)     // → T | null
transaction(async (client) => { ... })
```

**Never use an ORM or query builder.** The `@neondatabase/serverless` driver uses WebSocket transport (port 443) — the standard Postgres wire protocol on port 5432 does not work in this environment.

Every query **must** filter by `household_id` taken from `req.user!.householdId` (set by `requireAuth` middleware from the JWT). Never trust `household_id` from the request body.

## Route conventions

- All routes mount via `requireAuth` at the top of each router file
- Thin handlers: parse body → call db helper → return JSON
- 404 when a row isn't found or doesn't belong to the household
- Use `RETURNING *` to return the mutated row directly
- Scoped household queries always use the pattern: `WHERE id = $1 AND household_id = $2`

## Item status lifecycle

```
SEARCHING → READY_TO_ORDER → ORDERED → ARRIVED → INSTALLED
                                    ↘ CANCELLED
```

Progress % counts ORDERED + ARRIVED + INSTALLED as "done" (not just INSTALLED).
`totalSpent` counts `actual_price` WHERE status IN ('ORDERED', 'ARRIVED', 'INSTALLED').

## Image storage (`src/storage.ts`)

`saveImage()` returns what goes directly into the DB's `image_path` column:
- **Dev** (no `BLOB_READ_WRITE_TOKEN`): relative path `householdId/itemId/uuid.ext`
- **Prod** (token set): full `https://` Vercel Blob CDN URL

Never construct image URLs on the server — the client resolves them via `imgSrc()` in `client/src/lib/utils/image.ts`.

## Auth cookies

`sameSite: "none" + secure: true` in production (cross-origin between two Vercel domains).
`sameSite: "lax"` in dev. Never change this without testing both environments.

## Serverless export

`src/index.ts` exports `app` as default for `@vercel/node`. `app.listen()` is skipped when `process.env.VERCEL === "1"`. Do not remove the conditional.

## Adding a new route

1. Create or open the relevant router file in `src/routes/`
2. Make sure `router.use(requireAuth)` is at the top
3. Write the handler: validate → db query (always scoped to `householdId`) → return JSON
4. Mount the router in `src/index.ts`

## Schema changes

Edit `src/db/schema.sql` (idempotent — use `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS`), then run `npm run migrate`. Never write a destructive migration.

## Common gotchas

- `queryOne` returns `null` (not `undefined`) when no row is found
- Numeric columns come back as `string` from Neon — always wrap in `Number()`
- `transaction()` receives a client that has `.query()` (not the module-level helper)
- The `fetch-image` endpoints have a 15 s `AbortSignal.timeout` — Israeli retail sites often block server-side requests, so always implement a manual URL fallback
- `import()` of `@vercel/blob` is dynamic to avoid loading it in dev
