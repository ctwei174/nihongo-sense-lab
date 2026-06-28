import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);

async function installPdfDomPolyfills() {
  const target = globalThis as unknown as Record<string, unknown>;

  if (target.DOMMatrix && target.ImageData && target.Path2D) {
    return;
  }

  const { DOMMatrix, ImageData, Path2D } = await import("@napi-rs/canvas");

  target.DOMMatrix ??= DOMMatrix;
  target.ImageData ??= ImageData;
  target.Path2D ??= Path2D;
}

function getPdfWorkerUrl() {
  const workerPath = require.resolve("pdfjs-dist/legacy/build/pdf.worker.mjs");

  return pathToFileURL(workerPath).href;
}

export async function readPdfText(buffer: Buffer) {
  await installPdfDomPolyfills();

  const { PDFParse } = await import("pdf-parse");

  PDFParse.setWorker(getPdfWorkerUrl());

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText({
      imageBuffer: false,
      imageDataUrl: false,
    });

    return result.text;
  } finally {
    await parser.destroy();
  }
}
