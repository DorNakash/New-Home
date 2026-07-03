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
  const patterns = [
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
  ];
  let rawUrl: string | undefined;
  for (const re of patterns) { rawUrl = html.match(re)?.[1]; if (rawUrl) break; }
  if (!rawUrl) return null;
  const base = new URL(productUrl);
  return rawUrl.startsWith("//") ? `${base.protocol}${rawUrl}`
    : rawUrl.startsWith("http") ? rawUrl
    : new URL(rawUrl, base).toString();
}

export async function fetchOgImage(productUrl: string): Promise<string | null> {
  try {
    // Microlink handles anti-bot, Cloudflare, and geo-blocked Israeli sites
    const ml = await fetch(
      `https://api.microlink.io/?url=${encodeURIComponent(productUrl)}`,
      { signal: AbortSignal.timeout(6000) }
    ).catch(() => null);
    if (ml?.ok) {
      const body = await ml.json().catch(() => null) as { status: string; data?: { image?: { url?: string } } } | null;
      if (body?.status === "success" && body.data?.image?.url) return body.data.image.url;
    }
  } catch { /* Microlink unavailable */ }

  try {
    // Fallback: fetch HTML directly and parse og:image
    const direct = await fetch(productUrl, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(2000) });
    if (direct.ok) {
      const img = extractOgImage(await direct.text(), productUrl);
      if (img) return img;
    }
  } catch { /* site blocked or timeout */ }

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
