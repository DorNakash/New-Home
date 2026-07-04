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

async function attempt(name: string, fn: () => Promise<string | null>): Promise<string | null> {
  try {
    const r = await fn();
    console.log(`[og:${name}]`, r ? r.substring(0, 70) : "null");
    return r;
  } catch (e) {
    console.log(`[og:${name}] err:`, String(e).substring(0, 70));
    return null;
  }
}

export async function fetchOgImage(productUrl: string): Promise<string | null> {
  console.log("[fetchOgImage] START:", productUrl.substring(0, 100));
  const toImg = (html: string) => extractOgImage(html, productUrl);

  const strategies = [

    // 1. Direct — instant 403 on blocked sites so it fails fast and doesn't hold up Promise.any
    attempt("direct", async () => {
      const r = await fetch(productUrl, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(3000) });
      return r.ok ? toImg(await r.text()) : null;
    }),

    // 2. jsonlink.io — dedicated link preview SaaS, returns og:image without HTML parsing
    attempt("jsonlink", async () => {
      const r = await fetch(`https://jsonlink.io/api/extract?url=${encodeURIComponent(productUrl)}`, {
        signal: AbortSignal.timeout(6000),
      });
      if (!r.ok) return null;
      const d = await r.json() as { image?: string };
      return d.image ?? null;
    }),

    // 3. Wayback Machine — archive.org serves cached HTML, bypasses site firewall entirely
    attempt("wayback", async () => {
      const r = await fetch(`https://web.archive.org/web/${productUrl}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return null;
      const waybUrl = toImg(await r.text());
      if (!waybUrl) return null;
      // Strip archive.org wrapper to get the original CDN URL
      const original = waybUrl.replace(/^https?:\/\/web\.archive\.org\/web\/\d+(?:im_)?\//, "");
      return original.startsWith("http") ? original : waybUrl;
    }),

    // 4. Magento REST API — often has different WAF rules than the HTML frontend
    attempt("magento-api", async () => {
      const { pathname, origin } = new URL(productUrl);
      const urlKey = pathname.split("/").filter(Boolean).pop()?.replace(/\.html?$/i, "");
      if (!urlKey) return null;
      const apiUrl = `${origin}/rest/default/V1/products?searchCriteria[pageSize]=1` +
        `&searchCriteria[filterGroups][0][filters][0][field]=url_key` +
        `&searchCriteria[filterGroups][0][filters][0][value]=${encodeURIComponent(urlKey)}`;
      const r = await fetch(apiUrl, {
        headers: { Accept: "application/json", "User-Agent": PAGE_HEADERS["User-Agent"] },
        signal: AbortSignal.timeout(5000),
      });
      if (!r.ok) return null;
      const data = await r.json() as { items?: Array<{ media_gallery_entries?: Array<{ file?: string }> }> };
      const file = data.items?.[0]?.media_gallery_entries?.[0]?.file;
      return file ? `${origin}/pub/media/catalog/product${file}` : null;
    }),

    // 5. allorigins.win — Cloudflare Workers proxy
    attempt("allorigins", async () => {
      const r = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(productUrl)}`, {
        signal: AbortSignal.timeout(8000),
      });
      if (!r.ok) return null;
      const d = await r.json() as { contents?: string; status?: { http_code: number } };
      return d?.status?.http_code === 200 && d.contents ? toImg(d.contents) : null;
    }),

    // 6. corsproxy.io — independent proxy
    attempt("corsproxy", async () => {
      const r = await fetch(`https://corsproxy.io/?${encodeURIComponent(productUrl)}`, {
        signal: AbortSignal.timeout(8000),
      });
      return r.ok ? toImg(await r.text()) : null;
    }),
  ];

  const result = await Promise.any(
    strategies.map(p => p.then(v => (v !== null ? v : Promise.reject(new Error("no-image")))))
  ).catch(() => null) as string | null;

  console.log("[fetchOgImage] RESULT:", result ? result.substring(0, 80) : "null");
  return result;
}

const IMAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

export async function downloadImage(imageUrl: string, referer: string): Promise<Buffer | null> {
  // Wayback Machine: use im_ flag so archive.org serves raw image bytes, not the HTML toolbar
  const fetchUrl = imageUrl.replace(
    /^(https:\/\/web\.archive\.org\/web\/)(\d+)(\/)/,
    "$1$2im_$3"
  );

  // Extract original CDN URL from Wayback wrapper for the proxy attempt
  const originalUrl = imageUrl.replace(/^https:\/\/web\.archive\.org\/web\/\d+(?:im_)?\//, "");
  const proxyTarget = originalUrl.startsWith("http") ? originalUrl : imageUrl;

  // Run direct download and proxy in parallel — take whichever succeeds first
  const [directResult, proxyResult] = await Promise.allSettled([
    fetch(fetchUrl, { headers: { ...IMAGE_HEADERS, "Referer": referer }, signal: AbortSignal.timeout(4000) })
      .then(async r => {
        if (!r.ok) return null;
        const ct = r.headers.get("content-type") ?? "";
        return ct.startsWith("image/") ? Buffer.from(await r.arrayBuffer()) : null;
      }).catch(() => null),

    fetch(`https://images.weserv.nl/?url=${encodeURIComponent(proxyTarget)}`, {
      headers: IMAGE_HEADERS,
      signal: AbortSignal.timeout(4000),
    }).then(r => r.ok ? r.arrayBuffer().then(buf => Buffer.from(buf)) : null).catch(() => null),
  ]);

  const direct = directResult.status === "fulfilled" ? directResult.value : null;
  const proxy = proxyResult.status === "fulfilled" ? proxyResult.value : null;
  return direct ?? proxy;
}
