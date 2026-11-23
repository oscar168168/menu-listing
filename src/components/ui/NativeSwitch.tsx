"use client";

import { useId, useSyncExternalStore } from "react";

const emptySubscribe = () => () => {};

function getHasNativeSwitch(): boolean {
  return (
    typeof HTMLInputElement !== "undefined" &&
    "switch" in HTMLInputElement.prototype
  );
}

interface NativeSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  srOnlyLabel?: boolean;
  disabled?: boolean;
  id?: string;
}

/**
 * Accessible native <input type="checkbox" switch> with progressive-enhancement
 * role="switch" + CSS pill fallback when native `switch` attribute is unsupported.
 */
export function NativeSwitch({
  checked,
  onChange,
  label,
  srOnlyLabel = false,
  disabled = false,
  id,
}: NativeSwitchProps) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const hasNativeSwitch = useSyncExternalStore(
    emptySubscribe,
    getHasNativeSwitch,
    () => true
  );

  const switchAttr = { switch: "" } as Record<string, string>;

  return (
    <label
      htmlFor={inputId}
      className={`inline-flex items-center gap-2 select-none ${
        disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
      }`}
    >
      <input
        id={inputId}
        type="checkbox"
        {...switchAttr}
        role={hasNativeSwitch ? undefined : "switch"}
        data-switch-fallback={hasNativeSwitch ? undefined : "true"}
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-5 w-9"
      />
      <span
        className={
          srOnlyLabel
            ? "sr-only"
            : "text-[13px] font-medium text-zinc-700 whitespace-nowrap"
        }
      >
        {label}
      </span>
    </label>
  );
}
