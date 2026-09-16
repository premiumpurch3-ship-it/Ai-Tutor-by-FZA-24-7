export async function extractText(buffer: Buffer, fileType: string): Promise<{ text: string; pageCount?: number }> {
  const type = fileType.toLowerCase();

  if (type === "pdf") {
    // pdf-parse v2 exposes a class-based API; dynamic import keeps the
    // (fairly large) pdf.js dependency out of any client bundle.
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return { text: result.text, pageCount: result.pages.length };
    } finally {
      await parser.destroy();
    }
  }

  if (type === "docx") {
    const mammoth = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return { text: result.value };
  }

  if (type === "txt") {
    return { text: buffer.toString("utf-8") };
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}
