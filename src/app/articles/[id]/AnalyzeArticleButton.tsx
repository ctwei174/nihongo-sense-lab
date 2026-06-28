"use client";

import { useFormStatus } from "react-dom";

type AnalyzeArticleButtonProps = {
  hasAnalysis: boolean;
};

export default function AnalyzeArticleButton({
  hasAnalysis,
}: AnalyzeArticleButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-xl bg-white px-4 py-2 text-sm font-medium text-slate-950 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending
        ? "AI 正在精讀..."
        : hasAnalysis
          ? "重新精讀解析"
          : "開始 AI 精讀"}
    </button>
  );
}
