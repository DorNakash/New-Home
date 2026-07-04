import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";

export const UPLOADS_ROOT = path.join(process.cwd(), "uploads");

export async function saveImage(
  file: { buffer: Buffer; originalname: string },
  householdId: string,
  itemId: string
): Promise<string> {
  const ext = path.extname(file.originalname) || ".jpg";
  const blobPath = `${householdId}/${itemId}/${crypto.randomUUID()}${ext}`;

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const { put } = await import("@vercel/blob");
    const { url } = await put(blobPath, file.buffer, { access: "public" });
    return url;
  }

  const dir = path.join(UPLOADS_ROOT, householdId, itemId);
  await fs.mkdir(dir, { recursive: true });
  const filename = blobPath.split("/").pop()!;
  await fs.writeFile(path.join(dir, filename), file.buffer);
  return `${householdId}/${itemId}/${filename}`;
}

export function imageUrl(relativePath: string): string {
  if (relativePath.startsWith("http")) return relativePath;
  return `/uploads/${relativePath}`;
}

const PAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
  "Cache-Control": "no-cache",
};

function extractOgImage(html: string, productUrl: string): string | null {
  // Strategy 1: simple string search around og:image (robust against attribute ordering)
  let rawUrl: string | undefined;
  for (const marker of ["og:image", "twitter:image"]) {
    const idx = html.indexOf(marker);
    if (idx !== -1) {
      const ctx = html.substring(idx, idx + 300);
      const m = ctx.match(/content=["']([^"']{10,})["']/i);
      if (m) { rawUrl = m[1]; break; }
    }
  }

  // Strategy 2: JSON-LD structured data
  if (!rawUrl) {
    const tags = html.match(/<script[^>]+type=["']application\/ld\+json["'][^>]*>[\s\S]*?<\/script>/gi) ?? [];
    for (const tag of tags) {
      try {
        const json = JSON.parse(tag.replace(/<script[^>]*>/, "").replace(/<\/script>/, ""));
        const candidates = [json?.image, json?.image?.[0]].flat().filter((u: unknown) => typeof u === "string" && (u as string).startsWith("http"));
        if (candidates.length) { rawUrl = candidates[0] as string; break; }
      } catch { /* skip */ }
    }
  }

  // Strategy 3: Magento x-magento-init JSON (handles escaped slashes)
  if (!rawUrl) {
    const m = html.match(/"(?:full|img|src|url|image)"\s*:\s*"(https?:[^"]{5,})"/i);
    if (m) rawUrl = m[1].replace(/\\\//g, "/").split('"')[0];
  }

  // Strategy 4: any pub/media or media/catalog CDN URL anywhere in the page
  if (!rawUrl) {
    const m = html.match(/https?:(?:\\\/|\/)[^"'\s<>]+(?:pub\/media|media\/catalog)[^"'\s<>]+\.(?:jpe?g|png|webp)/i);
    if (m) rawUrl = m[0].replace(/\\\//g, "/");
  }

  // Strategy 5: data-src / data-lazy on img tags
  if (!rawUrl) {
    const m = html.match(/data-(?:src|lazy|original)=["'](https?:\/\/[^"']+\.(?:jpe?g|png|webp|gif))["']/i);
    if (m) rawUrl = m[1];
  }

  console.log("[extractOgImage] found:", rawUrl ? rawUrl.substring(0, 80) : "none", "| html length:", html.length);

  if (!rawUrl) return null;
  const base = new URL(productUrl);
  return rawUrl.startsWith("//") ? `${base.protocol}${rawUrl}`
    : rawUrl.startsWith("http") ? rawUrl
    : new URL(rawUrl, base).toString();
}

export async function fetchOgImage(productUrl: string): Promise<string | null> {
  console.log("[fetchOgImage] START:", productUrl.substring(0, 100));

  const toImg = (html: string) => extractOgImage(html, productUrl);

  // All strategies fire simultaneously; first to return a non-null image URL wins.
  // Promise.any resolves on first fulfillment, ignoring rejections.
  const strategies: Promise<string | null>[] = [

    // 1. Direct fetch — instant fail on blocked sites (0.1s 403), near-instant on allowed ones
    fetch(productUrl, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(3000) })
      .then(r => r.ok ? r.text().then(toImg) : null).catch(() => null),

    // 2. jsonlink.io — link preview SaaS; extracts og:image server-side without our HTML parsing
    fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(productUrl)}`, {
      signal: AbortSignal.timeout(6000),
    }).then(r => r.ok ? r.json().then((d: { image?: string }) => d?.image ?? null) : null).catch(() => null),

    // 3. allorigins.win — Cloudflare Workers proxy (different IP space than datacenter)
    fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(productUrl)}`, {
      signal: AbortSignal.timeout(8000),
    }).then(r => r.ok ? r.json().then((d: { contents?: string; status?: { http_code: number } }) =>
      d?.status?.http_code === 200 && d.contents ? toImg(d.contents) : null) : null).catch(() => null),

    // 4. corsproxy.io — independent proxy infrastructure
    fetch(`https://corsproxy.io/?${encodeURIComponent(productUrl)}`, {
      signal: AbortSignal.timeout(8000),
    }).then(r => r.ok ? r.text().then(toImg) : null).catch(() => null),
  ];

  const result = await Promise.any(
    strategies.map(p => p.then(v => (v !== null ? v : Promise.reject(new Error("no-image")))))
  ).catch(() => null) as string | null;

  console.log("[fetchOgImage] result:", result ? result.substring(0, 80) : "null");
  return result;
}

const IMAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

export async function downloadImage(imageUrl: string, referer: string): Promise<Buffer | null> {
  try {
    const direct = await fetch(imageUrl, {
      headers: { ...IMAGE_HEADERS, "Referer": referer },
      signal: AbortSignal.timeout(2000),
    });
    if (direct.ok) return Buffer.from(await direct.arrayBuffer());
  } catch { /* blocked or dropped */ }

  try {
    const proxy = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`, {
      headers: IMAGE_HEADERS,
      signal: AbortSignal.timeout(2000),
    });
    if (proxy.ok) return Buffer.from(await proxy.arrayBuffer());
  } catch { /* proxy failed */ }

  return null;
}
