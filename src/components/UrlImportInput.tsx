"use client";

import { useState } from "react";

type FetchState = "idle" | "loading" | "success" | "error";

export default function UrlImportInput() {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<FetchState>("idle");

  const handleFetch = async () => {
    if (!url.trim()) {
      setState("error");
      setMessage("請先貼上網址。");
      return;
    }

    setState("loading");
    setMessage("");

    const response = await fetch("/api/import-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    const data = (await response.json()) as {
      title?: string;
      content?: string;
      preview?: string;
      length?: number;
      error?: string;
    };

    if (!response.ok || data.error) {
      setState("error");
      setTitle("");
      setContent("");
      setPreview("");
      setMessage(data.error ?? "讀取失敗，請改用貼上文字。");
      return;
    }

    setTitle(data.title ?? "");
    setContent(data.content ?? "");
    setPreview(data.preview ?? "");
    setState("success");
    setMessage(`已讀取約 ${data.length ?? 0} 個字元。可先檢查預覽，再儲存。`);
  };

  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-slate-300">
        網址匯入，可選
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          name="source_url"
          value={url}
          onChange={(event) => {
            setUrl(event.target.value);
            setState("idle");
            setMessage("");
          }}
          placeholder="https://..."
          className="min-w-0 flex-1 rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-slate-400"
        />
        <button
          type="button"
          onClick={handleFetch}
          disabled={state === "loading"}
          className="rounded-xl bg-[#52648f] px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#42537c] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "loading" ? "讀取中..." : "讀取網址"}
        </button>
      </div>

      <input type="hidden" name="fetched_url_title" value={title} />
      <input type="hidden" name="fetched_url_content" value={content} />

      <p className="mt-2 text-xs leading-5 text-slate-500">
        可先按「讀取網址」確認抓到的正文。需要登入、反爬限制或動態載入的網站可能無法讀取。
      </p>

      {message && (
        <p
          className={`mt-3 rounded-xl border px-4 py-3 text-sm leading-6 ${
            state === "error"
              ? "border-red-200 bg-red-50 text-red-700"
              : "border-slate-700 bg-slate-900 text-slate-300"
          }`}
        >
          {message}
        </p>
      )}

      {preview && (
        <div className="mt-3 rounded-2xl border border-slate-700 bg-slate-900 p-4">
          {title && (
            <p className="mb-2 text-sm font-semibold text-slate-200">{title}</p>
          )}
          <p className="max-h-48 overflow-auto whitespace-pre-wrap text-sm leading-6 text-slate-400">
            {preview}
          </p>
        </div>
      )}
    </div>
  );
}
