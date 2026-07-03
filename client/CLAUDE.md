# Client — Claude guidance

## What this is

Hebrew RTL React SPA for a 2-user household furnishing tracker. The server is a separate repo at `../server/`. The app is in Hebrew; all UI text, labels, and error messages should stay in Hebrew.

## Key constraints — read before touching anything

**RTL first.** `<html dir="rtl">` is set globally. Always use Tailwind logical properties (`ms-*`, `me-*`, `text-start`, `text-end`, `ps-*`, `pe-*`). Never use physical left/right/ml/mr in new code.

**`<Currency>` for all prices.** Money amounts must be wrapped in the `<Currency>` component (`src/components/items/Currency.tsx`) which renders inside `<span dir="ltr">` to prevent Hebrew+digit reordering. Never format prices as plain text.

**`imgSrc()` for all image URLs.** Use `imgSrc(path)` from `src/lib/utils/image.ts` for every image src. In dev, images are served from the local Express server; in prod they are Vercel Blob CDN URLs. Never construct `/uploads/` URLs manually.

**`credentials: "include"` is mandatory.** Auth is an httpOnly cookie. The `api()` helper in `src/lib/api.ts` handles this automatically — always use it, never use raw `fetch`.

## React Query conventions

Query keys:
```
["me"]                          auth state
["rooms"]                       room list
["room", roomId]                room detail + items
["items-search", filters]       search results
["item", itemId]                item detail + options
["dashboard-summary"]           all dashboard aggregates
["stores"]
["categories"]
```

After any mutation, invalidate related keys. When items change, always also invalidate `["dashboard-summary"]`. When rooms change, invalidate both `["rooms"]` and `["dashboard-summary"]`.

All query hooks live in `src/lib/queries/*.ts`. Add new hooks there, not inline in components.

## File organisation

- **Pages** are thin: they compose components and call hooks. Keep business logic in hooks.
- **Components** in `src/components/items/` are shared across pages.
- **UI primitives** in `src/components/ui/` are Base UI / shadcn — prefer editing these sparingly.

## Item status

```
SEARCHING → READY_TO_ORDER → ORDERED → ARRIVED → INSTALLED
                                    ↘ CANCELLED
```

Labels are in `src/lib/constants/status.ts`. Never hardcode Hebrew status strings elsewhere. Progress % counts ORDERED + ARRIVED + INSTALLED as done.

## Excel import/export

All Excel logic is in `src/lib/utils/excel.ts`. The import flow is:
1. `parseExcelFile` (client-side SheetJS parse, filters empty rows)
2. `autoMap` (fuzzy Hebrew/English column detection)
3. `transformRows` (fill-down merged cells, status mapping, URL validation)
4. POST transformed rows to `/api/import`

Do not move any of this to the server. The file is parsed in the browser to avoid upload size limits.

## Adding a new page

1. Create `src/pages/MyPage.tsx`
2. Add a route in `src/App.tsx` inside `<ProtectedRoute>`
3. Add a React Query hook in the relevant `src/lib/queries/` file if needed
4. Use `useNavigate(-1)` + `<ArrowRight>` back button pattern for sub-pages

## Adding a new mutation

1. Add the hook to the relevant `src/lib/queries/*.ts` file
2. Use `useMutation` with `mutationFn` calling `api()`
3. In `onSuccess`, invalidate all affected query keys
4. Return the hook from a named export (`useDeleteItem`, `useUpdateRoom`, etc.)

## Common gotchas

- `window.open(url, "_blank", "noopener,noreferrer")` — never use `render={<a>}` inside clickable cards; it doesn't propagate the click correctly
- Long URLs in dialogs need `className="break-all"` on textarea / `className="truncate"` on inputs to prevent modal overflow
- `object-contain p-2` for product images — `object-cover` crops furniture photos badly
- The `Progress` component from `src/components/ui/progress.tsx` applies `className` to the root flex wrapper, NOT the track. Use a raw `<div>` with inline `style={{ width: "X%" }}` for progress bars that need a specific height
- React Query's `useQueryClient` must be called at the top level of a hook or component, not inside callbacks
- All numeric values from the API come as numbers (the server wraps Neon's string returns in `Number()`) — no need to coerce on the client
