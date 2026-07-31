// Deterministic half of the metadata: everything derivable without a model.
// Runs in the service worker at save time, and in the side panel to backfill
// clips that predate metadata.

import { SCHEMA_VERSION } from "./schema.js";
import { extractPalette } from "./palette.js";

export async function buildBaseMetadata({
  dataUrl,
  source = "capture",
  host = "",
  url = "",
  createdAt = Date.now(),
}) {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  try {
    return {
      schemaVersion: SCHEMA_VERSION,
      capturedAt: new Date(createdAt).toISOString(),
      source,
      origin: { host, url },
      image: {
        width: bitmap.width,
        height: bitmap.height,
        format: blob.type || "image/png",
        bytes: blob.size,
      },
      palette: await extractPalette(bitmap),
    };
  } finally {
    bitmap.close();
  }
}
