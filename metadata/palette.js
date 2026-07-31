// Dominant-color extraction. Pure canvas math, no AI: downscale the image,
// bucket pixels in a coarse RGB grid, return the top buckets as {hex, share}
// sorted by coverage. Runs in both the service worker and the side panel —
// OffscreenCanvas exists in both.

const SAMPLE = 48; // downscale target; ~2300 samples is plenty for a swatch
const BITS = 3; // bits per channel → 512 buckets
const MAX_COLORS = 6;

export async function extractPalette(bitmap) {
  const scale = Math.min(1, SAMPLE / Math.max(bitmap.width, bitmap.height));
  const w = Math.max(1, Math.round(bitmap.width * scale));
  const h = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = new OffscreenCanvas(w, h);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);

  const shift = 8 - BITS;
  const buckets = new Map(); // key -> channel sums + count, averaged at the end
  let total = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 128) continue; // skip transparent pixels
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const key =
      ((r >> shift) << (BITS * 2)) | ((g >> shift) << BITS) | (b >> shift);
    let bkt = buckets.get(key);
    if (!bkt) buckets.set(key, (bkt = { count: 0, r: 0, g: 0, b: 0 }));
    bkt.count++;
    bkt.r += r;
    bkt.g += g;
    bkt.b += b;
    total++;
  }
  if (!total) return [];

  return [...buckets.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, MAX_COLORS)
    .map((bkt) => ({
      hex: toHex(bkt.r / bkt.count, bkt.g / bkt.count, bkt.b / bkt.count),
      share: Math.round((bkt.count / total) * 1000) / 1000,
    }));
}

function toHex(r, g, b) {
  const c = (v) => Math.round(v).toString(16).padStart(2, "0");
  return `#${c(r)}${c(g)}${c(b)}`;
}
