const plainTextFileExtensions = [".txt", ".csv", ".md"];
const wordFileExtensions = [".docx"];
const excelFileExtensions = [".xls", ".xlsx", ".csv"];
const pdfFileExtensions = [".pdf"];
const powerPointFileExtensions = [".pptx"];
const maxFetchedUrlBytes = 4 * 1024 * 1024;
const fetchTimeoutMs = 10000;
const minArticleBodyLength = 280;

type FetchedMaterial = {
  title: string;
  content: string;
};

function getFileExtension(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return "";
  }

  return fileName.slice(dotIndex).toLowerCase();
}

function getTitleFromFileName(fileName: string) {
  const dotIndex = fileName.lastIndexOf(".");

  if (dotIndex === -1) {
    return fileName;
  }

  return fileName.slice(0, dotIndex);
}

function getFileNameFromUrl(url: string) {
  try {
    const parsedUrl = new URL(url);
    const pathname = decodeURIComponent(parsedUrl.pathname);
    const lastSegment = pathname.split("/").filter(Boolean).at(-1);

    return lastSegment || parsedUrl.hostname;
  } catch {
    return url;
  }
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\t/g, " ")
    .replace(/[ \u3000]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeBuffer(buffer: Buffer, contentType: string) {
  const charset =
    contentType.match(/charset=([^;\s]+)/i)?.[1]?.trim().toLowerCase() ?? "utf-8";

  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return buffer.toString("utf8");
  }
}

function decodeHtmlText(text: string) {
  return text
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, codePoint: string) =>
      String.fromCodePoint(Number(codePoint)),
    )
    .replace(/&#x([0-9a-f]+);/gi, (_, codePoint: string) =>
      String.fromCodePoint(Number.parseInt(codePoint, 16)),
    );
}

function stripHtmlTags(text: string) {
  return decodeHtmlText(text.replace(/<[^>]+>/g, " "));
}

function removeHtmlNoise(html: string) {
  return html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<svg[\s\S]*?<\/svg>/gi, " ")
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, " ")
    .replace(/<(header|footer|nav|aside|form)[\s\S]*?<\/\1>/gi, " ");
}

function extractMetaContent(html: string, key: string) {
  const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(
    `<meta[^>]+(?:property|name)=["']${escapedKey}["'][^>]+content=["']([^"']+)["'][^>]*>`,
    "i",
  );

  return normalizeExtractedText(stripHtmlTags(html.match(regex)?.[1] ?? ""));
}

function extractHtmlTitle(html: string) {
  const title =
    extractMetaContent(html, "og:title") ||
    html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
    html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
    "";

  return normalizeExtractedText(stripHtmlTags(title));
}

function getCandidateBlocks(html: string) {
  const cleanedHtml = removeHtmlNoise(html);
  const patterns = [
    /<article[^>]*>([\s\S]*?)<\/article>/gi,
    /<main[^>]*>([\s\S]*?)<\/main>/gi,
    /<section[^>]+(?:id|class)=["'][^"']*(?:article|Article|entry|content|Content|main|Main|body|Body)[^"']*["'][^>]*>([\s\S]*?)<\/section>/gi,
    /<div[^>]+(?:id|class)=["'][^"']*(?:article|Article|entry|content|Content|main|Main|body|Body|text|Text)[^"']*["'][^>]*>([\s\S]*?)<\/div>/gi,
  ];

  const blocks = patterns.flatMap((pattern) =>
    Array.from(cleanedHtml.matchAll(pattern)).map((match) => match[1]),
  );

  if (blocks.length > 0) {
    return blocks;
  }

  return [cleanedHtml.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ?? cleanedHtml];
}

function isNoiseLine(line: string) {
  const trimmed = line.trim();

  if (trimmed.length < 2) {
    return true;
  }

  if (/^(広告|PR|ADVERTISEMENT|関連記事|おすすめ|ピックアップ|速報・新着ニュース)$/.test(trimmed)) {
    return true;
  }

  if (
    /(googletag|dataLayer|articleUrl|thumbnailUrl|imageUrl|iref=|utm_|function\(|console\.log|displayFlg|Adsense|OutBrain|BFF\d+)/.test(
      trimmed,
    )
  ) {
    return true;
  }

  if (trimmed.length > 500 && /[{}[\]":,]/.test(trimmed)) {
    return true;
  }

  return false;
}

function htmlBlockToText(block: string) {
  const separated = block
    .replace(/<(br|p|div|section|article|li|tr|h[1-6])[^>]*>/gi, "\n")
    .replace(/<\/(p|div|section|article|li|tr|h[1-6])>/gi, "\n");

  const lines = stripHtmlTags(separated)
    .split("\n")
    .map((line) => normalizeExtractedText(line))
    .filter((line) => !isNoiseLine(line));

  return lines.join("\n");
}

function extractJsonLdArticle(html: string) {
  const scripts = Array.from(
    html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    ),
  );

  for (const script of scripts) {
    try {
      const parsed = JSON.parse(decodeHtmlText(script[1]));
      const nodes = Array.isArray(parsed) ? parsed : [parsed];
      const article = nodes
        .flatMap((node) => (Array.isArray(node["@graph"]) ? node["@graph"] : [node]))
        .find((node) => {
          const type = node?.["@type"];

          return Array.isArray(type)
            ? type.some((item) => String(item).includes("Article"))
            : String(type).includes("Article");
        });

      if (article) {
        const articleBody = normalizeExtractedText(article.articleBody ?? "");
        const fallbackContent = normalizeExtractedText(
          [article.description, article.abstract].filter(Boolean).join("\n\n"),
        );
        const content = articleBody || fallbackContent;

        if (articleBody.length >= minArticleBodyLength) {
          return {
            title: normalizeExtractedText(article.headline ?? article.name ?? ""),
            content: articleBody,
          };
        }

        if (content.length >= minArticleBodyLength) {
          return {
            title: normalizeExtractedText(article.headline ?? article.name ?? ""),
            content,
          };
        }
      }
    } catch {
      // Ignore malformed structured data and continue with HTML extraction.
    }
  }

  return null;
}

function extractReadableHtml(html: string): FetchedMaterial {
  const jsonLd = extractJsonLdArticle(html);

  if (jsonLd?.content && jsonLd.content.length >= minArticleBodyLength) {
    return jsonLd;
  }

  const candidates = getCandidateBlocks(html)
    .map((block) => htmlBlockToText(block))
    .map((text) => normalizeExtractedText(text))
    .filter((text) => text.length >= 80)
    .sort((a, b) => b.length - a.length);

  const metaDescription =
    extractMetaContent(html, "description") ||
    extractMetaContent(html, "og:description");
  const content = candidates[0] || metaDescription;

  return {
    title: jsonLd?.title || extractHtmlTitle(html),
    content: normalizeExtractedText(content).slice(0, 20000),
  };
}

function assertSafePublicUrl(parsedUrl: URL) {
  const hostname = parsedUrl.hostname.toLowerCase();

  if (
    hostname === "localhost" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname.startsWith("127.") ||
    hostname.startsWith("10.") ||
    hostname.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname)
  ) {
    throw new Error("基於安全限制，目前只能讀取公開網址。");
  }
}

async function readWordBuffer(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  return result.value;
}

async function readExcelBuffer(buffer: Buffer) {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, { type: "buffer" });

  return workbook.SheetNames.map((sheetName) => {
    const sheet = workbook.Sheets[sheetName];
    const csv = XLSX.utils.sheet_to_csv(sheet, { blankrows: false });

    return [`# ${sheetName}`, csv].join("\n");
  }).join("\n\n");
}

async function readPdfBuffer(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return result.text;
}

async function readPowerPointBuffer(buffer: Buffer) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(buffer);
  const slidePaths = Object.keys(zip.files)
    .filter((path) => /^ppt\/slides\/slide\d+\.xml$/.test(path))
    .sort((a, b) => {
      const aNumber = Number(a.match(/slide(\d+)\.xml$/)?.[1] ?? 0);
      const bNumber = Number(b.match(/slide(\d+)\.xml$/)?.[1] ?? 0);

      return aNumber - bNumber;
    });

  const slides = await Promise.all(
    slidePaths.map(async (path, index) => {
      const xml = await zip.files[path].async("text");
      const textRuns = Array.from(xml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g))
        .map((match) => stripHtmlTags(match[1]))
        .map((text) => text.trim())
        .filter(Boolean);

      return [`# Slide ${index + 1}`, textRuns.join("\n")].join("\n");
    }),
  );

  return slides.join("\n\n");
}

async function parseBufferByExtension(buffer: Buffer, extension: string) {
  if (plainTextFileExtensions.includes(extension)) {
    return buffer.toString("utf8");
  }

  if (wordFileExtensions.includes(extension)) {
    return readWordBuffer(buffer);
  }

  if (excelFileExtensions.includes(extension)) {
    return readExcelBuffer(buffer);
  }

  if (pdfFileExtensions.includes(extension)) {
    return readPdfBuffer(buffer);
  }

  if (powerPointFileExtensions.includes(extension)) {
    return readPowerPointBuffer(buffer);
  }

  return "";
}

export async function fetchUrlMaterial(sourceUrl: string): Promise<FetchedMaterial> {
  let parsedUrl: URL;

  try {
    parsedUrl = new URL(sourceUrl);
  } catch {
    throw new Error("網址格式不正確，請確認是完整的 https:// 或 http:// 連結。");
  }

  if (!["http:", "https:"].includes(parsedUrl.protocol)) {
    throw new Error("目前只支援 http 或 https 網址。");
  }

  assertSafePublicUrl(parsedUrl);

  const response = await fetch(parsedUrl, {
    headers: {
      Accept:
        "text/html,application/xhtml+xml,application/pdf,text/plain,*/*;q=0.8",
      "User-Agent":
        "Mozilla/5.0 (compatible; NihongoSenseLab/1.0; +https://nihongo-sense-lab.vercel.app)",
    },
    signal: AbortSignal.timeout(fetchTimeoutMs),
  });

  if (!response.ok) {
    throw new Error(`無法讀取網址內容，HTTP 狀態碼：${response.status}。`);
  }

  const contentLength = Number(response.headers.get("content-length") ?? 0);

  if (contentLength > maxFetchedUrlBytes) {
    throw new Error("網址內容太大，請改用貼上重點段落或上傳檔案。");
  }

  const arrayBuffer = await response.arrayBuffer();

  if (arrayBuffer.byteLength > maxFetchedUrlBytes) {
    throw new Error("網址內容太大，請改用貼上重點段落或上傳檔案。");
  }

  const buffer = Buffer.from(arrayBuffer);
  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  const extension = getFileExtension(parsedUrl.pathname);

  if (contentType.includes("text/html") || extension === ".html") {
    const result = extractReadableHtml(decodeBuffer(buffer, contentType));

    if (!result.content || result.content.length < 40) {
      throw new Error("已讀取網頁，但沒有找到足夠的正文內容。請改用貼上文字。");
    }

    return result;
  }

  if (
    contentType.startsWith("text/") ||
    plainTextFileExtensions.includes(extension)
  ) {
    return {
      title: getTitleFromFileName(getFileNameFromUrl(sourceUrl)),
      content: normalizeExtractedText(buffer.toString("utf8")),
    };
  }

  const parsedContent = await parseBufferByExtension(buffer, extension);

  if (parsedContent) {
    return {
      title: getTitleFromFileName(getFileNameFromUrl(sourceUrl)),
      content: normalizeExtractedText(parsedContent),
    };
  }

  throw new Error("無法從這個網址判斷可讀取的文字內容，請改用貼上文字或上傳檔案。");
}
