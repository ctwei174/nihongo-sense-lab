"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import type { ChatMessage } from "@/lib/ai/chatAssistant";

type ChatState = "idle" | "loading" | "error";

function getPageText() {
  return document.body.innerText
    .replace(/\s{3,}/g, "\n")
    .replace(/\n{4,}/g, "\n\n")
    .trim()
    .slice(0, 6000);
}

export default function FloatingChat() {
  const pathname = usePathname();
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "我是 GPT 日文助教。可以問我這頁的單字、文法、語感差異，或請我幫你改日文句子。",
    },
  ]);
  const [state, setState] = useState<ChatState>("idle");
  const [error, setError] = useState("");

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ block: "end" });
    }
  }, [messages, open]);

  const handleSend = async () => {
    const question = input.trim();

    if (!question || state === "loading") {
      return;
    }

    const nextMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: question },
    ];

    setMessages(nextMessages);
    setInput("");
    setState("loading");
    setError("");

    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages,
        pagePath: pathname,
        pageText: getPageText(),
      }),
    });
    const data = (await response.json()) as {
      answer?: string;
      error?: string;
    };

    if (!response.ok || data.error || !data.answer) {
      setState("error");
      setError(data.error ?? "GPT 助教暫時沒有回應，請稍後再試。");
      return;
    }

    setMessages((current) => [
      ...current,
      { role: "assistant", content: data.answer ?? "" },
    ]);
    setState("idle");
  };

  return (
    <div
      data-chat-widget
      className="fixed bottom-5 right-5 z-[90] flex max-w-[calc(100vw-2rem)] flex-col items-end"
    >
      {open && (
        <section className="mb-3 flex h-[min(620px,calc(100vh-7rem))] w-[min(420px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-[#d8dee9] bg-white shadow-[0_18px_60px_rgba(23,32,51,0.18)]">
          <header className="flex items-center justify-between border-b border-[#e6ebf2] px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[#172033]">GPT 日文助教</p>
              <p className="text-xs text-[#728096]">可參考目前頁面內容回答</p>
            </div>
            <button
              type="button"
              data-no-global-feedback
              onClick={() => setOpen(false)}
              className="rounded-full border border-[#d8dee9] bg-white px-3 py-1 text-sm text-[#59667a] transition hover:bg-[#eef3f8]"
              aria-label="關閉 GPT 對話框"
            >
              關閉
            </button>
          </header>

          <div className="flex-1 space-y-3 overflow-y-auto bg-[#f8fafd] px-4 py-4">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                  message.role === "user"
                    ? "ml-auto bg-[#52648f] text-white"
                    : "mr-auto border border-[#d8dee9] bg-white text-[#172033]"
                }`}
              >
                {message.content}
              </div>
            ))}
            {state === "loading" && (
              <div className="mr-auto rounded-2xl border border-[#d8dee9] bg-white px-4 py-3 text-sm text-[#728096]">
                思考中...
              </div>
            )}
            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-[#e6ebf2] bg-white p-3">
            <textarea
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void handleSend();
                }
              }}
              rows={3}
              placeholder="問單字、文法、語感，或貼上句子請我修改..."
              className="w-full resize-none rounded-xl border border-[#d8dee9] bg-white px-3 py-2 text-sm leading-6 text-[#172033] outline-none transition placeholder:text-[#9aa6b8] focus:border-[#60739e]"
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-xs text-[#728096]">Enter 送出，Shift+Enter 換行</p>
              <button
                type="button"
                data-no-global-feedback
                onClick={() => void handleSend()}
                disabled={!input.trim() || state === "loading"}
                className="rounded-full bg-[#52648f] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#42537c] disabled:cursor-not-allowed disabled:opacity-55"
              >
                送出
              </button>
            </div>
          </div>
        </section>
      )}

      <button
        type="button"
        data-no-global-feedback
        onClick={() => setOpen((current) => !current)}
        className="rounded-full border border-[#d8dee9] bg-[#52648f] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_28px_rgba(23,32,51,0.22)] transition hover:bg-[#42537c]"
        aria-expanded={open}
        aria-label="開啟 GPT 日文助教"
      >
        GPT 助教
      </button>
    </div>
  );
}
