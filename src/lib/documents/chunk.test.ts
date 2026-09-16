import { describe, it, expect } from "vitest";
import { chunkText } from "@/lib/documents/chunk";

describe("chunkText", () => {
  it("returns no chunks for empty input", () => {
    expect(chunkText("")).toEqual([]);
    expect(chunkText("   ")).toEqual([]);
  });

  it("returns a single chunk for short text", () => {
    const chunks = chunkText("This is a short document about photosynthesis.");
    expect(chunks).toHaveLength(1);
    expect(chunks[0].index).toBe(0);
  });

  it("splits long text into multiple overlapping chunks", () => {
    const longText = Array.from({ length: 1200 }, (_, i) => `word${i}`).join(" ");
    const chunks = chunkText(longText, 450, 60);
    expect(chunks.length).toBeGreaterThan(1);
    // Every chunk index should be sequential starting at 0.
    chunks.forEach((c, i) => expect(c.index).toBe(i));
  });

  it("assigns a positive token estimate to every chunk", () => {
    const chunks = chunkText("Some study material with enough words to matter here.");
    chunks.forEach((c) => expect(c.tokenEstimate).toBeGreaterThan(0));
  });
});
