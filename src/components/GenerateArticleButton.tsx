"use client";

import { useState } from "react";

type GenerateState = "idle" | "loading" | "success" | "error";

export default function GenerateArticleButton() {
  const [state, setState] = useState<GenerateState>("idle");
  const [message, setMessage] = useState("");

  const handleGenerate = async (
    event: React.MouseEvent<HTMLButtonElement>,
  ) => {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    const formData = new FormData(form);
    const title = String(formData.get("title") ?? "").trim();
    const topic = String(formData.get("topic") ?? "").trim();
    const materialType = String(formData.get("material_type") ?? "article");
    const contentField = form.elements.namedItem("content");

    if (!title && !topic) {
      setState("error");
      setMessage("請先輸入標題或主題，再生成短文。");
      return;
    }

    if (!(contentField instanceof HTMLTextAreaElement)) {
      setState("error");
      setMessage("找不到可填入文章內容的欄位。");
      return;
    }

    if (
      contentField.value.trim() &&
      !window.confirm("目前已有內容，要用 AI 生成的新文章取代嗎？")
    ) {
      return;
    }

    setState("loading");
    setMessage("");

    const response = await fetch("/api/generate-article", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, topic, materialType }),
    });
    const data = (await response.json()) as {
      content?: string;
      length?: number;
      error?: string;
    };

    if (!response.ok || data.error || !data.content) {
      setState("error");
      setMessage(data.error ?? "AI 生成失敗，請稍後再試。");
      return;
    }

    contentField.value = data.content;
    contentField.dispatchEvent(new Event("input", { bubbles: true }));
    contentField.dispatchEvent(new Event("change", { bubbles: true }));

    setState("success");
    setMessage(`已生成約 ${data.length ?? data.content.length} 字的 N1 短文。`);
  };

  return (
    <div className="mt-3 flex flex-col gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6 text-slate-600">
        輸入標題或主題後，可先生成一篇 500-1000 字的 N1 日文短文。
      </p>
      <div className="flex flex-col gap-2 sm:items-end">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={state === "loading"}
          className="rounded-full border border-slate-300 bg-slate-50 px-4 py-2 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state === "loading" ? "生成中..." : "AI 生成短文"}
        </button>
        {message && (
          <p
            className={`text-xs leading-5 ${
              state === "error" ? "text-red-600" : "text-slate-500"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}
