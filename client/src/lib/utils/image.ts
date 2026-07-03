const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3001";

export function imgSrc(path: string | null | undefined): string | null {
  if (!path) return null;
  // Vercel Blob returns a full https:// URL; local dev returns a relative path
  return path.startsWith("http") ? path : `${API_BASE}/uploads/${path}`;
}
