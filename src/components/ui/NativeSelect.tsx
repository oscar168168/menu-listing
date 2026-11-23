"use client";

import { ChevronDown } from "lucide-react";

export interface SelectOption {
  value: string;
  label: string;
}

interface NativeSelectProps {
  id?: string;
  name?: string;
  ariaLabel?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  fullWidth?: boolean;
  className?: string;
}

/**
 * Branded native <select> implementing modern-web-guidance `branded-select-styling`:
 * Uses `appearance: base-select` + `::picker(select)` in modern browsers with
 * custom Lucide chevron fallback when `base-select` is unsupported.
 */
export function NativeSelect({
  id,
  name,
  ariaLabel,
  value,
  onChange,
  options,
  fullWidth = false,
  className = "",
}: NativeSelectProps) {
  return (
    <span className={`ui-select-wrap ${fullWidth ? "w-full" : ""}`}>
      <select
        id={id}
        name={name}
        aria-label={ariaLabel}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`ui-select ${fullWidth ? "w-full" : ""} ${className}`}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="ui-select-fallback-icon pointer-events-none absolute right-2.5 h-3.5 w-3.5 text-zinc-500"
        strokeWidth={1.75}
      />
    </span>
  );
}
