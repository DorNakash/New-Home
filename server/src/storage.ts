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
  console.log("[fetchOgImage] START url:", productUrl.substring(0, 100));

  try {
    console.log("[fetchOgImage] calling microlink...");
    const ml = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(productUrl)}`,
      { signal: AbortSignal.timeout(6000) }
    ).catch((e: unknown) => { console.log("[fetchOgImage] microlink fetch error:", String(e)); return null; });
    if (ml?.ok) {
      const body = await ml.json().catch(() => null) as { status: string; data?: { image?: { url?: string } } } | null;
      console.log("[fetchOgImage] microlink response:", body?.status, body?.data?.image?.url ?? "no image");
      if (body?.status === "success" && body.data?.image?.url) return body.data.image.url;
    } else {
      console.log("[fetchOgImage] microlink not ok:", ml?.status);
    }
  } catch (e) {
    console.log("[fetchOgImage] microlink outer catch:", String(e));
  }

  try {
    console.log("[fetchOgImage] calling direct fetch...");
    const direct = await fetch(productUrl, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(4000) });
    console.log("[fetchOgImage] direct status:", direct.status);
    if (direct.ok) {
      const html = await direct.text();
      console.log("[fetchOgImage] html length:", html.length, "| snippet:", html.substring(0, 200).replace(/\n/g, " "));
      const img = extractOgImage(html, productUrl);
      console.log("[fetchOgImage] extracted img:", img ?? "none");
      if (img) return img;
    }
  } catch (e) {
    console.log("[fetchOgImage] direct catch:", String(e));
  }

  // HTML proxy via allorigins.win — Cloudflare-backed, bypasses datacenter IP blocks (403s from Israeli retail sites)
  try {
    console.log("[fetchOgImage] calling allorigins proxy...");
    const proxy = await fetch(
      `https://api.allorigins.win/get?url=${encodeURIComponent(productUrl)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    console.log("[fetchOgImage] allorigins status:", proxy.status);
    if (proxy.ok) {
      const data = await proxy.json() as { contents?: string; status?: { http_code: number } };
      console.log("[fetchOgImage] allorigins http_code:", data.status?.http_code, "| contents length:", data.contents?.length ?? 0);
      if (data.status?.http_code === 200 && data.contents) {
        const img = extractOgImage(data.contents, productUrl);
        console.log("[fetchOgImage] allorigins extracted img:", img ?? "none");
        if (img) return img;
      }
    }
  } catch (e) {
    console.log("[fetchOgImage] allorigins catch:", String(e));
  }

  console.log("[fetchOgImage] DONE returning null");
  return null;
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
