"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  LogOut,
  MoreHorizontal,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Settings2,
} from "lucide-react";
import { ChhneQrMark } from "@/components/ui/ChhneQrLogo";
import { NativeDialog } from "@/components/ui/NativeDialog";
import {
  PortalLanguageSwitcher,
  usePortalLocale,
} from "@/components/ui/PortalLanguageSwitcher";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { resolveLocalized } from "@/lib/i18n";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import { slugify } from "@/lib/slug";
import type {
  Locale,
  ScanAnalyticsRow,
  SessionUser,
  SuperAdminTenantSummary,
  TenantStatusType,
  VendorMode,
} from "@/types/menu";

const ProvisionTenantModal = dynamic(
  () =>
    import("@/components/super-admin/ProvisionTenantModal").then(
      (m) => m.ProvisionTenantModal
    ),
  { ssr: false }
);

interface SuperAdminDashboardPayload {
  tenants: SuperAdminTenantSummary[];
  analytics: ScanAnalyticsRow[];
  totals: {
    totalTenants: number;
    activeTenants: number;
    suspendedTenants: number;
    totalItems: number;
    totalScans: number;
    scansLast7Days: number;
  };
}

interface SuperAdminWorkspaceProps {
  initialData: SuperAdminDashboardPayload;
  user: SessionUser;
  initialLocale?: Locale;
}

export function SuperAdminWorkspace({
  initialData,
  user,
  initialLocale = "km",
}: SuperAdminWorkspaceProps) {
  const router = useRouter();
  const [locale, setLocale] = usePortalLocale(initialLocale);
  const t = PORTAL_COPY[locale].superAdmin;
  const c = PORTAL_COPY[locale].common;

  const [data, setData] = useState<SuperAdminDashboardPayload>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TenantStatusType>(
    "ALL"
  );
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionMounted, setProvisionMounted] = useState(false);
  const [confirmSuspendTenant, setConfirmSuspendTenant] =
    useState<SuperAdminTenantSummary | null>(null);
  const [editingTenant, setEditingTenant] =
    useState<SuperAdminTenantSummary | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameKm, setEditNameKm] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const [openMenuState, setOpenMenuState] = useState<{
    tenantId: string;
    top: number;
    right: number;
  } | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const getTenantDisplayName = useCallback(
    (tenant: { nameKm?: string; nameEn?: string; name: string }) =>
      resolveLocalized(locale, tenant.nameKm, tenant.nameEn, tenant.name),
    [locale]
  );

  useEffect(() => {
    if (!openMenuState) return;
    const close = () => setOpenMenuState(null);
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("[data-row-actions-menu]")) return;
      close();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", close, true);
    window.addEventListener("resize", close);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("resize", close);
    };
  }, [openMenuState]);

  const activeMenuTenant = useMemo(
    () =>
      openMenuState
        ? (data.tenants.find((tItem) => tItem.id === openMenuState.tenantId) ??
          null)
        : null,
    [data.tenants, openMenuState]
  );

  const toggleRowActionsMenu = (
    tenantId: string,
    buttonEl: HTMLButtonElement
  ) => {
    if (openMenuState?.tenantId === tenantId) {
      setOpenMenuState(null);
      return;
    }
    const rect = buttonEl.getBoundingClientRect();
    setOpenMenuState({
      tenantId,
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  };

  const notify = useCallback(
    (text: string, tone: "neutral" | "error" = "neutral") => {
      setToast({ id: Date.now(), text, tone });
    },
    []
  );

  const openEditTenantModal = (tenant: SuperAdminTenantSummary) => {
    setEditingTenant(tenant);
    setEditSlug(tenant.slug);
    setEditNameEn(tenant.nameEn || tenant.name);
    setEditNameKm(tenant.nameKm || "");
    setEditError(null);
  };

  const handleSaveTenantEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    const normalizedSlug = slugify(editSlug);
    if (!normalizedSlug || normalizedSlug.length < 2) {
      setEditError(t.slugError);
      return;
    }

    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/super-admin/tenants/${editingTenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: normalizedSlug,
          name: editNameKm.trim() || editNameEn.trim() || editingTenant.name,
          nameKm: editNameKm.trim(),
          nameEn: editNameEn.trim(),
        }),
      });
      const json = (await res.json()) as {
        error?: string;
        tenant?: {
          id: string;
          slug: string;
          name: string;
          nameEn: string;
          nameKm: string;
        };
      };
      if (!res.ok || !json.tenant) {
        throw new Error(json.error ?? t.toastUpdateVenueError);
      }

      const updated = json.tenant;
      const primaryDisplay = updated.nameKm || updated.nameEn || updated.name;
      setData((prev) => ({
        ...prev,
        tenants: prev.tenants.map((item) =>
          item.id === updated.id
            ? {
                ...item,
                slug: updated.slug,
                name: primaryDisplay,
                nameEn: updated.nameEn,
                nameKm: updated.nameKm,
              }
            : item
        ),
        analytics: prev.analytics.map((a) =>
          a.tenantId === updated.id
            ? {
                ...a,
                slug: updated.slug,
                tenantName: primaryDisplay,
                tenantNameKm: updated.nameKm,
                tenantNameEn: updated.nameEn,
              }
            : a
        ),
      }));

      setEditingTenant(null);
      notify(
        t.toastUpdatedVenue(
          getTenantDisplayName(updated),
          updated.slug
        )
      );
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : t.toastUpdateVenueError
      );
    } finally {
      setEditSaving(false);
    }
  };

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.tenants.filter((tenant) => {
      const matchesStatus =
        statusFilter === "ALL" || tenant.status === statusFilter;
      const matchesQuery =
        q.length === 0 ||
        tenant.name.toLowerCase().includes(q) ||
        tenant.nameKm.toLowerCase().includes(q) ||
        tenant.nameEn.toLowerCase().includes(q) ||
        tenant.slug.toLowerCase().includes(q) ||
        (tenant.ownerEmail?.toLowerCase().includes(q) ?? false) ||
        (tenant.ownerUsername?.toLowerCase().includes(q) ?? false) ||
        (tenant.ownerPhone?.toLowerCase().includes(q) ?? false);
      return matchesStatus && matchesQuery;
    });
  }, [data.tenants, searchQuery, statusFilter]);

  const maxScans = useMemo(
    () => Math.max(1, ...data.analytics.map((a) => a.totalScans)),
    [data.analytics]
  );

  const updateTenantStatus = async (
    tenant: SuperAdminTenantSummary,
    nextStatus: TenantStatusType
  ) => {
    setBusyTenantId(tenant.id);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error(t.toastStatusError);

      setData((prev) => {
        const nextTenants = prev.tenants.map((item) =>
          item.id === tenant.id ? { ...item, status: nextStatus } : item
        );
        const activeTenants = nextTenants.filter(
          (item) => item.status === "ACTIVE"
        ).length;
        return {
          ...prev,
          tenants: nextTenants,
          totals: {
            ...prev.totals,
            activeTenants,
            suspendedTenants: nextTenants.length - activeTenants,
          },
        };
      });

      const displayName = getTenantDisplayName(tenant);
      notify(
        nextStatus === "SUSPENDED"
          ? t.toastSuspended(displayName)
          : t.toastActivated(displayName)
      );
    } catch {
      notify(t.toastStatusError, "error");
    } finally {
      setBusyTenantId(null);
      setConfirmSuspendTenant(null);
    }
  };

  const updateTenantMode = async (
    tenant: SuperAdminTenantSummary,
    nextMode: VendorMode
  ) => {
    setBusyTenantId(tenant.id);
    try {
      const res = await fetch(`/api/super-admin/tenants/${tenant.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorMode: nextMode }),
      });
      if (!res.ok) throw new Error(t.toastModeError);

      setData((prev) => ({
        ...prev,
        tenants: prev.tenants.map((item) =>
          item.id === tenant.id ? { ...item, vendorMode: nextMode } : item
        ),
      }));
      const displayName = getTenantDisplayName(tenant);
      notify(
        nextMode === "CART"
          ? t.toastModeCart(displayName)
          : t.toastModeListing(displayName)
      );
    } catch {
      notify(t.toastModeError, "error");
    } finally {
      setBusyTenantId(null);
    }
  };

  const handleImpersonate = async (tenant: SuperAdminTenantSummary) => {
    setBusyTenantId(tenant.id);
    try {
      const res = await fetch("/api/super-admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: tenant.id }),
      });
      if (!res.ok) throw new Error(t.toastImpersonateError);
      router.push("/admin");
    } catch {
      notify(t.toastImpersonateError, "error");
      setBusyTenantId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "km" ? "km-KH" : "en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div lang={locale} className="min-h-dvh bg-[#FAFAFA] text-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/" title="ChhneQR">
              <ChhneQrMark size={30} />
            </Link>
            <div className="min-w-0">
              <p className="truncate text-[14px] font-semibold tracking-[-0.02em] text-zinc-950">
                {t.brandTitle}
              </p>
              <p className="hidden truncate text-[11px] text-zinc-500 sm:block">
                {t.brandSubtitle} · {user.username || user.phone || user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <PortalLanguageSwitcher
              locale={locale}
              onChange={setLocale}
              compact
            />
            <button
              type="button"
              onClick={() => {
                setProvisionMounted(true);
                setProvisionOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{t.newVenue}</span>
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label={c.signOut}
              title={c.signOut}
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6">
        {/* Disciplined Swiss Typographic Summary Strip */}
        <section
          aria-label={t.platformMetricsAria}
          className="grid grid-cols-2 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0"
        >
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              {t.onboardedVenues}
            </p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-zinc-950">
              {data.totals.totalTenants}
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              {t.activeSuspended}
            </p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-zinc-950">
              {data.totals.activeTenants}
              <span className="mx-1.5 text-zinc-300">/</span>
              <span className="text-zinc-500">
                {data.totals.suspendedTenants}
              </span>
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              {t.publishedItems}
            </p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-zinc-950">
              {data.totals.totalItems}
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              {t.qrScansSummary}
            </p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-zinc-950">
              {data.totals.scansLast7Days}
              <span className="mx-1.5 text-zinc-300">/</span>
              <span className="text-zinc-500">{data.totals.totalScans}</span>
            </p>
          </div>
        </section>

        {/* Tenant Directory */}
        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-200 px-4 py-3.5">
            <div>
              <h1
                id="tenant-directory-heading"
                className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950"
              >
                {t.directoryHeading}
              </h1>
              <p className="text-[12px] text-zinc-500">{t.directorySubtitle}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400"
                  strokeWidth={1.5}
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t.searchPlaceholder}
                  aria-label={t.searchAria}
                  className="w-56 rounded-md border border-zinc-200 bg-[#FAFAFA] py-1.5 pl-8 pr-3 text-[13px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:bg-white focus:outline-none"
                />
              </div>

              <div className="inline-flex rounded-md border border-zinc-200 bg-[#FAFAFA] p-0.5 text-[12px]">
                {(["ALL", "ACTIVE", "SUSPENDED"] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`rounded px-2.5 py-1 font-medium transition-colors ${
                      statusFilter === status
                        ? "bg-white text-zinc-950 border border-zinc-200"
                        : "text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {status === "ALL"
                      ? c.all
                      : status === "ACTIVE"
                        ? c.active
                        : c.suspended}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div
            tabIndex={0}
            role="region"
            aria-labelledby="tenant-directory-heading"
            className="responsive-table-wrapper"
          >
            <table className="responsive-table text-left text-[13px]">
              <caption className="sr-only">{t.tableCaption}</caption>
              <thead className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
                <tr>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    {t.colVenue}
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    {t.colLogin}
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    {t.colStatus}
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    {t.colMode}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-right"
                  >
                    {t.colItems}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-right"
                  >
                    {t.colScans}
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    {t.colCreated}
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-right"
                  >
                    {t.colActions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200">
                {filteredTenants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={8}
                      className="px-4 py-10 text-center text-[13px] text-zinc-500"
                    >
                      {t.noMatch}
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const isBusy = busyTenantId === tenant.id;
                    const displayName = getTenantDisplayName(tenant);
                    return (
                      <tr
                        key={tenant.id}
                        className="transition-colors hover:bg-[#FAFAFA]"
                      >
                        <th scope="row" className="px-4 py-3 font-normal">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="h-3 w-3 shrink-0 rounded-full border border-black/15"
                              style={{ backgroundColor: tenant.primaryColor }}
                              aria-hidden="true"
                            />
                            <div className="min-w-0 max-w-[240px] lg:max-w-[280px]">
                              <p className="truncate text-[13.5px] font-semibold text-zinc-950">
                                {displayName}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                <button
                                  type="button"
                                  onClick={() => openEditTenantModal(tenant)}
                                  title={t.editSlugTitle}
                                  className="group inline-flex shrink-0 items-center gap-1 font-mono text-[11px] text-zinc-500 hover:text-zinc-950"
                                >
                                  <span>/m/{tenant.slug}</span>
                                  <Pencil
                                    className="h-2.5 w-2.5 opacity-60 group-hover:opacity-100"
                                    strokeWidth={1.75}
                                  />
                                </button>
                              </div>
                            </div>
                          </div>
                        </th>

                        <td
                          data-label={t.colLogin}
                          className="whitespace-nowrap px-4 py-3 text-zinc-600"
                        >
                          {tenant.ownerEmail ?? (
                            <span className="text-zinc-400">
                              {t.unassigned}
                            </span>
                          )}
                        </td>

                        <td
                          data-label={t.colStatus}
                          className="whitespace-nowrap px-4 py-3"
                        >
                          {tenant.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-900">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              {c.active}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                              {c.suspended}
                            </span>
                          )}
                        </td>

                        <td
                          data-label={t.colMode}
                          className="whitespace-nowrap px-4 py-3"
                        >
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() =>
                              void updateTenantMode(
                                tenant,
                                tenant.vendorMode === "CART"
                                  ? "LISTING_ONLY"
                                  : "CART"
                              )
                            }
                            title={t.switchModeTitle}
                            className="inline-flex items-center whitespace-nowrap rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:bg-white disabled:opacity-40"
                          >
                            {tenant.vendorMode === "CART"
                              ? c.addToCart
                              : c.listingOnly}
                          </button>
                        </td>

                        <td
                          data-label={t.colItems}
                          className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800"
                        >
                          {tenant.itemCount}
                        </td>

                        <td
                          data-label={t.colScans}
                          className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800"
                        >
                          <span className="font-medium">{tenant.scanCount}</span>
                          <span className="ml-1 text-[11px] text-zinc-400">
                            ({tenant.scansLast7Days})
                          </span>
                        </td>

                        <td
                          data-label={t.colCreated}
                          className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-500"
                        >
                          {formatDate(tenant.createdAt)}
                        </td>

                        <td
                          data-label={t.colActions}
                          className="whitespace-nowrap px-4 py-3 text-right"
                        >
                          <div
                            data-row-actions-menu
                            className="inline-flex justify-end"
                          >
                            <button
                              type="button"
                              disabled={isBusy}
                              aria-label={t.moreActionsFor(displayName)}
                              aria-haspopup="menu"
                              aria-expanded={
                                openMenuState?.tenantId === tenant.id
                              }
                              onClick={(e) =>
                                toggleRowActionsMenu(tenant.id, e.currentTarget)
                              }
                              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-700 transition-colors hover:border-zinc-400 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40"
                            >
                              <MoreHorizontal
                                className="h-4 w-4"
                                strokeWidth={1.75}
                              />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* QR Scan Analytics Summary */}
        <section className="rounded-xl border border-zinc-200 bg-white">
          <div className="border-b border-zinc-200 px-4 py-3.5">
            <h2 className="text-[15px] font-semibold tracking-[-0.02em] text-zinc-950">
              {t.analyticsTitle}
            </h2>
            <p className="text-[12px] text-zinc-500">{t.analyticsSubtitle}</p>
          </div>

          <div className="divide-y divide-zinc-200">
            {data.analytics.map((row) => {
              const barWidthPct = Math.max(
                4,
                Math.round((row.totalScans / maxScans) * 100)
              );
              const rowDisplayName = resolveLocalized(
                locale,
                row.tenantNameKm,
                row.tenantNameEn,
                row.tenantName
              );
              return (
                <div
                  key={row.tenantId}
                  className="grid grid-cols-1 gap-3 px-4 py-3.5 md:grid-cols-[260px_1fr_240px] md:items-center"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                      style={{ backgroundColor: row.primaryColor }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-950">
                        {rowDisplayName}
                      </p>
                      <p className="font-mono text-[11px] text-zinc-400">
                        /m/{row.slug}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="tabular-nums font-medium text-zinc-900">
                        {t.totalScans(row.totalScans)}
                      </span>
                      <span className="tabular-nums text-zinc-500">
                        {t.last7Days(row.last7Days)}
                      </span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-100">
                      <div
                        className="h-full rounded-full bg-zinc-900"
                        style={{ width: `${barWidthPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:justify-end">
                    {row.topTables.length > 0 ? (
                      row.topTables.map((table) => (
                        <span
                          key={table.tableCode}
                          className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] tabular-nums text-zinc-600"
                        >
                          {t.tableBadge(table.tableCode, table.count)}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400">
                        {t.noTableTags}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </main>

      {/* Provision Tenant Modal (lazy-loaded on first open) */}
      {provisionMounted && (
        <ProvisionTenantModal
          open={provisionOpen}
          locale={locale}
          onClose={() => setProvisionOpen(false)}
          onProvisioned={({ summary, analyticsRow }) => {
            setData((prev) => ({
              tenants: [summary, ...prev.tenants],
              analytics: [...prev.analytics, analyticsRow].sort(
                (a, b) => b.totalScans - a.totalScans
              ),
              totals: {
                ...prev.totals,
                totalTenants: prev.totals.totalTenants + 1,
                activeTenants: prev.totals.activeTenants + 1,
              },
            }));
            notify(t.toastProvisioned);
          }}
        />
      )}

      {/* Edit Venue & URL Slug Modal */}
      <NativeDialog
        open={Boolean(editingTenant)}
        onClose={() => setEditingTenant(null)}
        title={t.editModalTitle}
        subtitle={t.editModalSubtitle}
        closeLabel={c.closeDialog}
        maxWidthClass="max-w-md"
      >
        <form
          lang={locale}
          onSubmit={(e) => void handleSaveTenantEdit(e)}
          className="p-5 space-y-4"
        >
          <div>
            <label
              htmlFor="edit-tenant-slug"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.slugLabel}
            </label>
            <div className="mt-1 flex items-center rounded-lg border border-zinc-200 bg-white focus-within:border-zinc-950">
              <span className="pl-3 pr-1 font-mono text-[12.5px] text-zinc-400">
                /m/
              </span>
              <input
                id="edit-tenant-slug"
                type="text"
                required
                maxLength={48}
                value={editSlug}
                onChange={(e) => setEditSlug(e.target.value)}
                placeholder="seaside-bistro"
                autoFocus
                className="w-full bg-transparent py-2 pr-3 font-mono text-[13.5px] text-zinc-950 focus:outline-none"
              />
            </div>
            {slugify(editNameEn).length >= 2 &&
              slugify(editNameEn) !== editSlug && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                  <span>{t.slugSuggestions}</span>
                  <button
                    type="button"
                    onClick={() => setEditSlug(slugify(editNameEn))}
                    className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100"
                  >
                    /m/{slugify(editNameEn)}
                  </button>
                </div>
              )}
          </div>

          <div>
            <label
              htmlFor="edit-tenant-name-km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.venueNameKmLabel}
            </label>
            <input
              id="edit-tenant-name-km"
              type="text"
              lang="km"
              required={!editNameEn.trim()}
              maxLength={100}
              value={editNameKm}
              onChange={(e) => setEditNameKm(e.target.value)}
              placeholder={t.venueNameKmPlaceholder}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13.5px] text-zinc-950 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-tenant-name-en"
              className="block text-[12px] font-medium text-zinc-700"
            >
              {t.venueNameEnLabel}
            </label>
            <input
              id="edit-tenant-name-en"
              type="text"
              required={!editNameKm.trim()}
              maxLength={100}
              value={editNameEn}
              onChange={(e) => setEditNameEn(e.target.value)}
              placeholder={t.venueNameEnPlaceholder}
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13.5px] text-zinc-950 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          {editError && (
            <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12.5px] text-red-700">
              {editError}
            </p>
          )}

          <div className="flex justify-end gap-2 border-t border-zinc-200 pt-3.5">
            <button
              type="button"
              onClick={() => setEditingTenant(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {c.cancel}
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="rounded-md bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {editSaving ? c.saving : c.saveChanges}
            </button>
          </div>
        </form>
      </NativeDialog>

      {/* Suspend Tenant Confirmation */}
      <NativeDialog
        open={Boolean(confirmSuspendTenant)}
        onClose={() => setConfirmSuspendTenant(null)}
        title={t.suspendModalTitle}
        subtitle={t.suspendModalSubtitle}
        closeLabel={c.closeDialog}
        maxWidthClass="max-w-sm"
      >
        <div lang={locale} className="p-5">
          <p className="text-[14px] leading-relaxed text-zinc-700">
            {t.suspendWarningPrefix}{" "}
            <strong className="font-semibold text-zinc-950">
              {confirmSuspendTenant
                ? getTenantDisplayName(confirmSuspendTenant)
                : ""}
            </strong>{" "}
            (<code className="font-mono text-[12px]">/m/{confirmSuspendTenant?.slug}</code>){" "}
            {t.suspendWarningSuffix}
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmSuspendTenant(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              {c.cancel}
            </button>
            <button
              type="button"
              onClick={() =>
                confirmSuspendTenant &&
                void updateTenantStatus(confirmSuspendTenant, "SUSPENDED")
              }
              className="rounded-md bg-red-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-700"
            >
              {t.confirmSuspendBtn}
            </button>
          </div>
        </div>
      </NativeDialog>

      {/* Floating Row Actions Menu */}
      {openMenuState && activeMenuTenant && (
        <div
          lang={locale}
          role="menu"
          aria-label={t.moreActionsFor(getTenantDisplayName(activeMenuTenant))}
          data-row-actions-menu
          style={{
            position: "fixed",
            top: openMenuState.top,
            right: openMenuState.right,
          }}
          className="z-50 min-w-[190px] rounded-lg border border-zinc-200 bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const target = activeMenuTenant;
              setOpenMenuState(null);
              openEditTenantModal(target);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
          >
            <Pencil className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{t.editVenueAndSlug}</span>
          </button>

          <Link
            href={`/m/${activeMenuTenant.slug}`}
            target="_blank"
            role="menuitem"
            onClick={() => setOpenMenuState(null)}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
          >
            <ExternalLink className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{t.openLiveMenu}</span>
          </Link>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              const target = activeMenuTenant;
              setOpenMenuState(null);
              void handleImpersonate(target);
            }}
            className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
          >
            <Settings2 className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{t.manageMenu}</span>
          </button>

          <div className="my-1 border-t border-zinc-100" role="separator" />

          {activeMenuTenant.status === "ACTIVE" ? (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const target = activeMenuTenant;
                setOpenMenuState(null);
                setConfirmSuspendTenant(target);
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <PauseCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{t.suspendVenue}</span>
            </button>
          ) : (
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                const target = activeMenuTenant;
                setOpenMenuState(null);
                void updateTenantStatus(target, "ACTIVE");
              }}
              className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-[12.5px] font-medium text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800"
            >
              <PlayCircle className="h-3.5 w-3.5" strokeWidth={1.5} />
              <span>{t.activateVenue}</span>
            </button>
          )}
        </div>
      )}

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
