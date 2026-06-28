"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const FALLBACK_DELAY_MS = 7000;
const BUTTON_FEEDBACK_MS = 900;

function isModifiedClick(event: MouseEvent) {
  return event.metaKey || event.ctrlKey || event.shiftKey || event.altKey;
}

function isSamePageHashLink(url: URL) {
  return (
    url.pathname === window.location.pathname &&
    url.search === window.location.search &&
    url.hash.length > 0
  );
}

export default function InteractionFeedback() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startFeedback = useCallback((duration = FALLBACK_DELAY_MS) => {
    clearTimer();
    setVisible(true);
    timerRef.current = window.setTimeout(() => {
      setVisible(false);
      timerRef.current = null;
    }, duration);
  }, [clearTimer]);

  useEffect(() => {
    clearTimer();
    const frameId = window.requestAnimationFrame(() => {
      setVisible(false);
    });

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [clearTimer, pathname]);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (event.defaultPrevented || isModifiedClick(event)) {
        return;
      }

      const target = event.target as HTMLElement | null;
      const anchor = target?.closest("a[href]") as HTMLAnchorElement | null;

      if (anchor) {
        if (anchor.target || anchor.hasAttribute("download")) {
          return;
        }

        const url = new URL(anchor.href, window.location.href);

        if (url.origin !== window.location.origin || isSamePageHashLink(url)) {
          return;
        }

        startFeedback();
        return;
      }

      const button = target?.closest("button") as HTMLButtonElement | null;

      if (button && !button.disabled) {
        startFeedback(BUTTON_FEEDBACK_MS);
      }
    };

    const handleSubmit = (event: SubmitEvent) => {
      if (!event.defaultPrevented) {
        startFeedback();
      }
    };

    document.addEventListener("click", handleClick, true);
    document.addEventListener("submit", handleSubmit, true);

    return () => {
      document.removeEventListener("click", handleClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      clearTimer();
    };
  }, [clearTimer, startFeedback]);

  if (!visible) {
    return null;
  }

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-[#dfe6f1]">
        <div className="h-full rounded-r-full bg-[#60739e] motion-safe:animate-[notebook-progress_1.15s_ease-in-out_infinite]" />
      </div>
      <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-full border border-[#d8dee9] bg-white/95 px-4 py-2 text-xs font-medium text-[#475569] shadow-sm backdrop-blur">
        載入中
      </div>
    </>
  );
}
