"use client";

import { useId, useState } from "react";

const acceptedFormats = [
  "txt",
  "csv",
  "md",
  "docx",
  "xlsx",
  "xls",
  "pdf",
  "pptx",
].join(" / ");

export default function MaterialFileInput() {
  const inputId = useId();
  const [fileName, setFileName] = useState("");

  return (
    <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900 p-5">
      <input
        id={inputId}
        name="material_file"
        type="file"
        accept=".txt,.csv,.md,.docx,.xls,.xlsx,.pdf,.pptx,text/plain,text/csv,text/markdown"
        className="sr-only"
        onChange={(event) => {
          setFileName(event.target.files?.[0]?.name ?? "");
        }}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-200">上傳檔案</p>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            支援 {acceptedFormats}。舊版 doc、ppt 請先另存為 docx 或 pptx。
          </p>
        </div>

        <label
          htmlFor={inputId}
          className="inline-flex cursor-pointer items-center justify-center rounded-xl bg-[#52648f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#42537c]"
        >
          選擇檔案
        </label>
      </div>

      <p className="mt-4 rounded-xl bg-slate-950 px-4 py-3 text-sm text-slate-400">
        {fileName || "尚未選擇檔案"}
      </p>
    </div>
  );
}
