"use client";

import Link from "next/link";
import { ExternalLink, Smartphone } from "lucide-react";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import { getTenantThemeStyle } from "@/lib/theme";
import { PublicMenuClient } from "@/components/public-menu/PublicMenuClient";
import type {
  Locale,
  SerializedCategory,
  SerializedTenant,
} from "@/types/menu";

interface MobilePreviewFrameProps {
  locale: Locale;
  tenant: SerializedTenant;
  categories: SerializedCategory[];
}

/**
 * Collapsible 375px live mobile viewport frame mirroring edits in real time.
 */
export function MobilePreviewFrame({
  locale,
  tenant,
  categories,
}: MobilePreviewFrameProps) {
  const t = PORTAL_COPY[locale].admin;
  const themeStyle = getTenantThemeStyle(tenant.primaryColor);

  return (
    <aside
      aria-label={t.previewTitle}
      className="sticky top-[73px] flex flex-col items-center"
    >
      <div className="mb-2.5 flex w-[375px] items-center justify-between px-1">
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-zinc-500">
          <Smartphone className="h-3.5 w-3.5" strokeWidth={1.5} />
          <span>{t.previewTitle}</span>
        </div>
        <Link
          href={`/m/${tenant.slug}`}
          target="_blank"
          className="inline-flex items-center gap-1 text-[12px] font-medium text-zinc-600 hover:text-zinc-950"
        >
          <span>{t.previewOpenLive}</span>
          <ExternalLink className="h-3 w-3" strokeWidth={1.5} />
        </Link>
      </div>

      <div
        style={themeStyle}
        className="w-[375px] h-[720px] overflow-hidden rounded-[26px] border border-zinc-300 bg-white flex flex-col"
      >
        {/* Minimal status chrome */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-[#FAFAFA] px-4 py-2 text-[11px] font-medium text-zinc-500 shrink-0">
          <span className="tabular-nums">9:41</span>
          <span className="truncate max-w-[200px] font-mono text-[10px] text-zinc-400">
            /m/{tenant.slug}
          </span>
          <span className="h-2 w-2 rounded-full bg-brand" aria-hidden="true" />
        </div>

        {/* Live public menu rendered directly from active admin state */}
        <div className="flex-1 overflow-y-auto thin-scrollbar">
          <PublicMenuClient
            tenant={tenant}
            categories={categories}
            isPreview={true}
          />
        </div>
      </div>
    </aside>
  );
}
