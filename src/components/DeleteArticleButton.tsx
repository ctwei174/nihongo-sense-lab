"use client";

type DeleteArticleButtonProps = {
  label?: string;
};

export default function DeleteArticleButton({
  label = "刪除",
}: DeleteArticleButtonProps) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        const confirmed = window.confirm(
          "確定要刪除這篇素材嗎？相關解析、語彙筆記、複習卡與輸出紀錄也會一併刪除。",
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
      className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 transition hover:bg-red-50"
    >
      {label}
    </button>
  );
}
