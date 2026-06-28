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
      {pending ? "AI 解析中..." : hasAnalysis ? "重新 AI 解析" : "AI 解析"}
    </button>
  );
}
