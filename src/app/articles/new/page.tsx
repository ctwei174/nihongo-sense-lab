import Link from "next/link";
import { redirect } from "next/navigation";
import AppNav from "@/components/AppNav";
import MaterialFileInput from "@/components/MaterialFileInput";
import UrlImportInput from "@/components/UrlImportInput";
import { createClient } from "@/lib/supabase/server";

type NewArticlePageProps = {
  searchParams?: Promise<{
    import_error?: string;
  }>;
};

const plainTextFileExtensions = [".txt", ".csv", ".md"];
const wordFileExtensions = [".docx"];
const excelFileExtensions = [".xls", ".xlsx", ".csv"];
const pdfFileExtensions = [".pdf"];
const powerPointFileExtensions = [".pptx"];
const maxUploadSizeBytes = 8 * 1024 * 1024;

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

function formatImportedContent(materialType: string, rawContent: string) {
  switch (materialType) {
    case "vocab":
      return [
        "【素材類型】語彙・表現メモ",
        "【學習目的】請從下列單字、表達、例句或自整理筆記中，抽出 N1-N2 級值得保存與輸出的表達。",
        "",
        rawContent,
      ].join("\n");
    case "sentences":
      return [
        "【素材類型】例句・文型メモ",
        "【學習目的】請從下列文句中整理句構、語感、搭配與可主動使用的高階表達。",
        "",
        rawContent,
      ].join("\n");
    default:
      return rawContent;
  }
}

function getDefaultTitle(materialType: string) {
  const date = new Date().toLocaleDateString("zh-TW");

  switch (materialType) {
    case "vocab":
      return `語彙筆記 ${date}`;
    case "sentences":
      return `文句筆記 ${date}`;
    default:
      return `精讀素材 ${date}`;
  }
}

function normalizeExtractedText(text: string) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeXmlText(text: string) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
}

function stripXmlTags(text: string) {
  return decodeXmlText(text.replace(/<[^>]+>/g, " "));
}

async function readWordUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return readWordBuffer(buffer);
}

async function readWordBuffer(buffer: Buffer) {
  const mammoth = await import("mammoth");
  const result = await mammoth.extractRawText({ buffer });

  return result.value;
}

async function readExcelUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return readExcelBuffer(buffer);
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

async function readPdfUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return readPdfBuffer(buffer);
}

async function readPdfBuffer(buffer: Buffer) {
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buffer });
  const result = await parser.getText();

  return result.text;
}

async function readPowerPointUpload(file: File) {
  const buffer = Buffer.from(await file.arrayBuffer());

  return readPowerPointBuffer(buffer);
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
        .map((match) => stripXmlTags(match[1]))
        .map((text) => text.trim())
        .filter(Boolean);

      return [`# Slide ${index + 1}`, textRuns.join("\n")].join("\n");
    }),
  );

  return slides.join("\n\n");
}

async function readUploadedMaterial(file: File) {
  if (!file.size) {
    return "";
  }

  if (file.size > maxUploadSizeBytes) {
    throw new Error("檔案太大，請控制在 8MB 以內，或先拆成較短的文字段落。");
  }

  const extension = getFileExtension(file.name);
  const isPlainText =
    file.type.startsWith("text/") || plainTextFileExtensions.includes(extension);

  if (isPlainText) {
    return file.text();
  }

  if (wordFileExtensions.includes(extension)) {
    return readWordUpload(file);
  }

  if (excelFileExtensions.includes(extension)) {
    return readExcelUpload(file);
  }

  if (pdfFileExtensions.includes(extension)) {
    return readPdfUpload(file);
  }

  if (powerPointFileExtensions.includes(extension)) {
    return readPowerPointUpload(file);
  }

  throw new Error(
    "目前支援 txt、csv、md、docx、xlsx、xls、pdf、pptx。舊版 doc、ppt 請先另存為 docx 或 pptx 後再上傳。",
  );
}

async function createArticle(formData: FormData) {
  "use server";

  const materialType = String(formData.get("material_type") ?? "article").trim();
  const file = formData.get("material_file");
  const uploadedFile = file instanceof File && file.size > 0 ? file : null;
  const pastedContent = String(formData.get("content") ?? "").trim();
  const sourceUrl = String(formData.get("source_url") ?? "").trim();
  const fetchedUrlTitle = String(formData.get("fetched_url_title") ?? "").trim();
  const fetchedUrlContent = String(
    formData.get("fetched_url_content") ?? "",
  ).trim();
  const topicInput = String(formData.get("topic") ?? "").trim();
  let title = String(formData.get("title") ?? "").trim();
  let uploadedContent = "";

  if (uploadedFile) {
    try {
      uploadedContent = normalizeExtractedText(
        await readUploadedMaterial(uploadedFile),
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);

      redirect(`/articles/new?import_error=${encodeURIComponent(message)}`);
    }
  }

  if (!title && uploadedFile) {
    title = getTitleFromFileName(uploadedFile.name);
  }

  if (!title && fetchedUrlTitle) {
    title = fetchedUrlTitle;
  }

  const rawContent = [
    pastedContent,
    uploadedContent,
    normalizeExtractedText(fetchedUrlContent),
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  if (!rawContent) {
    redirect(
      `/articles/new?import_error=${encodeURIComponent(
        "請至少提供一種匯入內容：貼上文字、上傳檔案，或輸入網址後按「讀取網址」。",
      )}`,
    );
  }

  if (!title) {
    title = getDefaultTitle(materialType);
  }

  const content = formatImportedContent(materialType, rawContent);
  const topic =
    topicInput ||
    (materialType === "vocab"
      ? "語彙筆記"
      : materialType === "sentences"
        ? "例句筆記"
        : null);

  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data, error } = await supabase
    .from("articles")
    .insert({
      user_id: user.id,
      title,
      content,
      source_url: sourceUrl || null,
      topic,
    })
    .select("id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/articles/${data.id}`);
}

export default async function NewArticlePage({
  searchParams,
}: NewArticlePageProps) {
  const resolvedSearchParams = await searchParams;
  const importError = resolvedSearchParams?.import_error;
  const supabase = await createClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    redirect("/login");
  }

  return (
    <main className="min-h-screen bg-slate-950 px-6 py-10 text-slate-100">
      <div className="mx-auto max-w-4xl">
        <AppNav />

        <header className="mb-8">
          <p className="text-sm text-slate-400">Nihongo Sense Lab</p>
          <h1 className="mt-2 text-3xl font-bold">匯入學習素材</h1>
          <p className="mt-3 text-slate-400">
            標題與主題可不填；貼上內容、上傳檔案、或輸入網址後按「讀取網址」三擇一即可。儲存後進入精讀頁，讓 AI 拆解主旨、句構與高階表達。
          </p>
        </header>

        {importError && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-700">
            {importError}
          </div>
        )}

        <form action={createArticle} className="space-y-5">
          <fieldset>
            <legend className="mb-3 block text-sm font-medium text-slate-300">
              素材類型
            </legend>
            <div className="grid gap-3 md:grid-cols-3">
              <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 p-4 transition hover:bg-slate-800">
                <input
                  type="radio"
                  name="material_type"
                  value="article"
                  defaultChecked
                  className="mr-2"
                />
                <span className="font-medium">文章精讀</span>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  新聞、評論、社論、小說片段或學術文章。
                </p>
              </label>

              <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 p-4 transition hover:bg-slate-800">
                <input
                  type="radio"
                  name="material_type"
                  value="vocab"
                  className="mr-2"
                />
                <span className="font-medium">單字與表達</span>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  單字表、搭配詞、片語、老師整理的重點。
                </p>
              </label>

              <label className="cursor-pointer rounded-xl border border-slate-700 bg-slate-900 p-4 transition hover:bg-slate-800">
                <input
                  type="radio"
                  name="material_type"
                  value="sentences"
                  className="mr-2"
                />
                <span className="font-medium">文句筆記</span>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  例句、文型、自己整理的日文句子與中文註記。
                </p>
              </label>
            </div>
          </fieldset>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              標題，可選
            </label>
            <input
              name="title"
              placeholder="例：少子化が社会に与える影響、N1 表現メモ、授業例文集"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              主題標籤，可選
            </label>
            <input
              name="topic"
              placeholder="例：社会、AI、経済、教育、語彙筆記"
              className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <UrlImportInput />

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              貼上內容，可選
            </label>
            <textarea
              name="content"
              rows={16}
              placeholder="ここに日本語の記事、単語表、例文、授業ノートなどを貼り付けてください。"
              className="w-full resize-y rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 leading-7 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
            />
          </div>

          <MaterialFileInput />

          <div className="flex items-center justify-between gap-4">
            <Link
              href="/articles"
              className="text-sm text-slate-400 hover:text-white"
            >
              ← 回文章庫
            </Link>

            <button
              type="submit"
              className="rounded-xl bg-white px-5 py-3 text-sm font-medium text-slate-950 transition hover:bg-slate-200"
            >
              儲存並進入精讀
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
