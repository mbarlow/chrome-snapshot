// Gemini Nano image inspector. The only file that touches the LanguageModel
// global (pattern lifted from chrome-packetlens). Everything feature-detected:
// image input is probed, never assumed. Runs in the side panel only — the MV3
// service worker can sleep mid-inference and drop the session.

import { AI_RESPONSE_SCHEMA, AI_PROMPT } from "../metadata/schema.js";

const IMAGE_OPTIONS = {
  expectedInputs: [{ type: "image" }, { type: "text", languages: ["en"] }],
  expectedOutputs: [{ type: "text", languages: ["en"] }],
};

// Returns { state, reason? } where state is one of:
// "missing"  -> LanguageModel global absent (old Chrome / unsupported OS)
// "unavailable" | "downloadable" | "downloading" | "available"
// "unavailable" here specifically means this build won't do image input.
export async function getImageAiAvailability() {
  if (typeof LanguageModel === "undefined") {
    return {
      state: "missing",
      reason:
        "LanguageModel is not available. Requires Chrome 138+ on a supported desktop OS.",
    };
  }
  try {
    return { state: await LanguageModel.availability(IMAGE_OPTIONS) };
  } catch (err) {
    return { state: "missing", reason: String(err?.message || err) };
  }
}

// Analyze one clip image: create a session, prompt once with the image under
// a responseConstraint, destroy. A fresh session per image keeps context and
// quota flat; the caller's queue is sequential so churn is negligible.
// First call may trigger the model download — report via onDownload(pct).
export async function analyzeImage(dataUrl, { onDownload } = {}) {
  const blob = await (await fetch(dataUrl)).blob();
  const bitmap = await createImageBitmap(blob);
  const session = await LanguageModel.create({
    ...IMAGE_OPTIONS,
    monitor(m) {
      m.addEventListener("downloadprogress", (e) => {
        const pct = Math.max(0, Math.min(100, Math.round((e.loaded ?? 0) * 100)));
        onDownload?.(pct);
      });
    },
  });
  try {
    const out = await session.prompt(
      [
        {
          role: "user",
          content: [
            { type: "text", value: AI_PROMPT },
            { type: "image", value: bitmap },
          ],
        },
      ],
      { responseConstraint: AI_RESPONSE_SCHEMA },
    );
    return JSON.parse(out);
  } finally {
    bitmap.close();
    try {
      session.destroy?.();
    } catch {
      /* ignore */
    }
  }
}
