"use client";

import { useEffect } from "react";
import { Check, AlertCircle, X } from "lucide-react";

export interface ToastMessage {
  id: number;
  text: string;
  tone?: "neutral" | "error";
}

export function Toast({
  message,
  onDismiss,
}: {
  message: ToastMessage | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(onDismiss, 3200);
    return () => clearTimeout(timer);
  }, [message, onDismiss]);

  if (!message) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed bottom-5 right-5 z-50 flex items-center gap-2.5 rounded-lg border border-zinc-200 bg-zinc-950 px-3.5 py-2.5 text-[13px] font-medium text-white"
    >
      {message.tone === "error" ? (
        <AlertCircle className="h-4 w-4 text-red-400 shrink-0" strokeWidth={1.5} />
      ) : (
        <Check className="h-4 w-4 text-zinc-300 shrink-0" strokeWidth={1.5} />
      )}
      <span>{message.text}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss notification"
        className="ml-1 text-zinc-400 hover:text-white"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
}
