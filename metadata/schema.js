// Clip metadata schema — the single definition of what a clip's `meta` field
// looks like. Bump SCHEMA_VERSION on breaking shape changes.
//
// Stored on each clip record as `meta`:
// {
//   schemaVersion: 1,
//   capturedAt:  ISO 8601 string
//   source:      "capture" | "paste"
//   origin:      { host }            — capturing page's hostname, "" for pastes
//   image:       { width, height, format, bytes }
//   palette:     [{ hex, share }]    — dominant colors, share is 0..1 of sampled pixels
//   ai: {
//     status:      "pending" | "done" | "error"
//     model:       "gemini-nano"       (done)
//     analyzedAt:  ISO 8601 string     (done)
//     description: string              (done) — one/two sentence summary
//     contents:    [string]            (done) — visible things, e.g. "terminal window"
//     text:        string              (done) — legible text in the image, "" if none
//     tags:        [string]            (done) — short lowercase keywords
//     error:       string              (error)
//   }
// }
//
// Everything above `ai` is deterministic and always present. `ai` stays
// "pending" until the user enables AI inspection and a Gemini Nano build
// with image input is available — never guessed, never faked. Annotating a
// clip refreshes the deterministic fields but keeps the existing analysis.

export const SCHEMA_VERSION = 1;

// Handed to the Prompt API as responseConstraint — the model's output is
// forced into this shape, so there is no prose parsing.
export const AI_RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["description", "contents", "text", "tags"],
  properties: {
    description: {
      type: "string",
      description: "One or two sentences describing what the image shows.",
    },
    contents: {
      type: "array",
      maxItems: 12,
      items: { type: "string" },
      description: "Distinct visible elements, short noun phrases.",
    },
    text: {
      type: "string",
      description: "Legible text visible in the image, empty string if none.",
    },
    tags: {
      type: "array",
      maxItems: 8,
      items: { type: "string" },
      description: "Short lowercase keywords for search.",
    },
  },
};

// Restrictive on purpose: report what is visible, never speculate. Same
// doctrine as packetlens — the model fills one labeled slot, nothing more.
export const AI_PROMPT = `Analyze this screenshot for a metadata index.
Report only what is visibly present in the image. Do not guess at anything
outside the frame, do not add opinions or recommendations. If text is
legible, transcribe the important parts; otherwise use an empty string.
Keep the description to one or two factual sentences.`;
