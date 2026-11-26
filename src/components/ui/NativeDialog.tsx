"use client";

import { useCallback, useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

let supportsDisplayTransitionCache: boolean | undefined;

function canTransitionDisplay(): boolean {
  if (supportsDisplayTransitionCache !== undefined) {
    return supportsDisplayTransitionCache;
  }
  if (
    typeof window === "undefined" ||
    !window.CSS?.supports?.("transition-behavior", "allow-discrete") ||
    !document.body
  ) {
    return false;
  }
  const probe = document.createElement("div");
  probe.style.cssText =
    "transition: display 1s allow-discrete !important; display: block;";
  document.body.appendChild(probe);
  void getComputedStyle(probe).display;
  probe.style.display = "none";
  supportsDisplayTransitionCache = getComputedStyle(probe).display === "block";
  probe.remove();
  return supportsDisplayTransitionCache;
}

function supportsTopLayerExit(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.CSS?.supports?.("overlay", "auto")) &&
    canTransitionDisplay()
  );
}

interface NativeDialogProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  ariaLabel?: string;
  variant?: "modal" | "sheet";
  lightDismiss?: boolean;
  maxWidthClass?: string;
  hideHeader?: boolean;
  closeLabel?: string;
  children: React.ReactNode;
}

/**
 * Accessible native <dialog> implementing modern-web-guidance rules:
 * - Opened via showModal() (no role="dialog" / aria-modal / body overflow hacks)
 * - closedby="any" for light dismiss + Safari pointer bounding-rect fallback
 * - Top-layer entry/exit animations with Firefox/Safari data-closing fallback
 */
export function NativeDialog({
  open,
  onClose,
  title,
  subtitle,
  ariaLabel,
  variant = "modal",
  lightDismiss = true,
  maxWidthClass,
  hideHeader = false,
  closeLabel = "Close dialog",
  children,
}: NativeDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closingRef = useRef(false);
  const titleId = useId();

  const animatedClose = useCallback(async () => {
    const dialog = dialogRef.current;
    if (!dialog || !dialog.open || closingRef.current) return;

    if (!supportsTopLayerExit()) {
      closingRef.current = true;
      dialog.setAttribute("data-closing", "");
      const animations = dialog.getAnimations({ subtree: true });
      if (animations.length > 0) {
        await Promise.race([
          Promise.allSettled(animations.map((a) => a.finished)),
          new Promise((r) => setTimeout(r, 320)),
        ]);
      }
      dialog.removeAttribute("data-closing");
      closingRef.current = false;
    }

    if (dialog.open) {
      dialog.close();
    }
  }, []);

  // Synchronize React open prop with native top-layer state
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.removeAttribute("data-closing");
      dialog.showModal();
    } else if (!open && dialog.open) {
      void animatedClose();
    }
  }, [open, animatedClose]);

  // Native cancel / close handlers + Safari closedby="any" fallback
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    const handleCancel = (event: Event) => {
      if (!supportsTopLayerExit()) {
        event.preventDefault();
        void animatedClose();
      }
    };

    const handleClose = () => {
      dialog.returnValue = "";
      onClose();
    };

    dialog.addEventListener("cancel", handleCancel);
    dialog.addEventListener("close", handleClose);

    // Safari fallback when HTMLDialogElement.prototype.closedBy is unsupported
    let pressedOutside = false;
    const isOutside = (e: PointerEvent) => {
      const rect = dialog.getBoundingClientRect();
      return (
        e.clientX < rect.left ||
        e.clientX > rect.right ||
        e.clientY < rect.top ||
        e.clientY > rect.bottom
      );
    };

    const needsFallback =
      lightDismiss &&
      typeof HTMLDialogElement !== "undefined" &&
      !("closedBy" in HTMLDialogElement.prototype);

    const handlePointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const handlePointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        void animatedClose();
      }
      pressedOutside = false;
    };

    if (needsFallback) {
      dialog.addEventListener("pointerdown", handlePointerDown);
      dialog.addEventListener("pointerup", handlePointerUp);
    }

    return () => {
      dialog.removeEventListener("cancel", handleCancel);
      dialog.removeEventListener("close", handleClose);
      if (needsFallback) {
        dialog.removeEventListener("pointerdown", handlePointerDown);
        dialog.removeEventListener("pointerup", handlePointerUp);
      }
    };
  }, [lightDismiss, onClose, animatedClose]);

  const variantClass =
    variant === "sheet" ? "ui-dialog-sheet" : "ui-dialog-modal";

  const surfaceClass =
    variant === "sheet"
      ? "w-full rounded-t-2xl border-t border-x border-zinc-200 bg-white overflow-hidden flex flex-col max-h-[90dvh]"
      : `w-full rounded-xl border border-zinc-200 bg-white overflow-hidden flex flex-col max-h-[calc(100dvh-2rem)] ${maxWidthClass ?? ""}`;

  const closedByAttr = {
    closedby: lightDismiss ? "any" : "closerequest",
  } as Record<string, string>;

  return (
    <dialog
      ref={dialogRef}
      {...closedByAttr}
      aria-labelledby={title && !hideHeader ? titleId : undefined}
      aria-label={!title || hideHeader ? ariaLabel ?? title ?? "Dialog" : undefined}
      className={`ui-dialog ${variantClass}`}
    >
      <div className={surfaceClass}>
        {variant === "sheet" && (
          <div className="flex justify-center pt-2.5 pb-1 shrink-0">
            <span
              className="h-1 w-9 rounded-full bg-zinc-200"
              aria-hidden="true"
            />
          </div>
        )}

        {!hideHeader && title && (
          <div className="flex items-start justify-between gap-4 border-b border-zinc-200 px-5 py-4 shrink-0">
            <div className="min-w-0">
              <h2
                id={titleId}
                className="text-[16px] font-semibold tracking-[-0.02em] text-zinc-950"
              >
                {title}
              </h2>
              {subtitle && (
                <p className="mt-0.5 text-[13px] text-zinc-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => void animatedClose()}
              aria-label={closeLabel}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-950"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        )}

        <div className="overflow-y-auto thin-scrollbar flex-1">{children}</div>
      </div>
    </dialog>
  );
}
