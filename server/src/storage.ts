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

export async function fetchPageHtml(url: string): Promise<string | null> {
  const direct = await fetch(url, { headers: PAGE_HEADERS, signal: AbortSignal.timeout(2500) }).catch(() => null);
  if (direct?.ok) return direct.text();

  const proxy = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`, {
    signal: AbortSignal.timeout(3500),
  }).catch(() => null);
  if (proxy?.ok) return proxy.text();

  return null;
}

const IMAGE_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
};

export async function downloadImage(imageUrl: string, referer: string): Promise<Buffer | null> {
  const direct = await fetch(imageUrl, {
    headers: { ...IMAGE_HEADERS, "Referer": referer },
    signal: AbortSignal.timeout(2500),
  }).catch(() => null);
  if (direct?.ok) return Buffer.from(await direct.arrayBuffer());

  const proxy = await fetch(`https://images.weserv.nl/?url=${encodeURIComponent(imageUrl)}`, {
    headers: IMAGE_HEADERS,
    signal: AbortSignal.timeout(2500),
  }).catch(() => null);
  if (proxy?.ok) return Buffer.from(await proxy.arrayBuffer());

  return null;
}
