export interface Chunk {
  index: number;
  content: string;
  tokenEstimate: number;
}

/**
 * Splits text into overlapping chunks along paragraph/sentence boundaries
 * where possible, targeting ~450 words per chunk with ~60 words overlap so
 * the tutor rarely loses context at a chunk edge.
 */
export function chunkText(text: string, targetWords = 450, overlapWords = 60): Chunk[] {
  const cleaned = text.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();
  if (!cleaned) return [];

  const words = cleaned.split(/\s+/);
  const chunks: Chunk[] = [];

  let start = 0;
  let index = 0;
  while (start < words.length) {
    const end = Math.min(start + targetWords, words.length);
    const content = words.slice(start, end).join(" ");
    chunks.push({
      index,
      content,
      tokenEstimate: Math.ceil(content.length / 4),
    });
    index += 1;
    if (end >= words.length) break;
    start = end - overlapWords;
  }

  return chunks;
}
