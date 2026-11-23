"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  LogOut,
  PauseCircle,
  PlayCircle,
  Plus,
  Search,
  Settings2,
  Shield,
} from "lucide-react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import type {
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
}

export function SuperAdminWorkspace({
  initialData,
  user,
}: SuperAdminWorkspaceProps) {
  const router = useRouter();
  const [data, setData] = useState<SuperAdminDashboardPayload>(initialData);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | TenantStatusType>(
    "ALL"
  );
  const [provisionOpen, setProvisionOpen] = useState(false);
  const [provisionMounted, setProvisionMounted] = useState(false);
  const [confirmSuspendTenant, setConfirmSuspendTenant] =
    useState<SuperAdminTenantSummary | null>(null);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const notify = useCallback(
    (text: string, tone: "neutral" | "error" = "neutral") => {
      setToast({ id: Date.now(), text, tone });
    },
    []
  );

  const filteredTenants = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return data.tenants.filter((tenant) => {
      const matchesStatus =
        statusFilter === "ALL" || tenant.status === statusFilter;
      const matchesQuery =
        q.length === 0 ||
        tenant.name.toLowerCase().includes(q) ||
        tenant.slug.toLowerCase().includes(q) ||
        (tenant.ownerEmail?.toLowerCase().includes(q) ?? false);
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
      if (!res.ok) throw new Error("Failed to update status");

      setData((prev) => {
        const nextTenants = prev.tenants.map((t) =>
          t.id === tenant.id ? { ...t, status: nextStatus } : t
        );
        const activeTenants = nextTenants.filter(
          (t) => t.status === "ACTIVE"
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

      notify(
        nextStatus === "SUSPENDED"
          ? `Suspended "${tenant.name}" — QR scans now show unavailable screen`
          : `Re-activated "${tenant.name}"`
      );
    } catch {
      notify("Could not update venue status", "error");
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
      if (!res.ok) throw new Error("Failed to update storefront mode");

      setData((prev) => ({
        ...prev,
        tenants: prev.tenants.map((t) =>
          t.id === tenant.id ? { ...t, vendorMode: nextMode } : t
        ),
      }));
      notify(
        nextMode === "CART"
          ? `"${tenant.name}" switched to Add to Cart mode`
          : `"${tenant.name}" switched to Product Listing Only mode`
      );
    } catch {
      notify("Could not update storefront mode", "error");
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
      if (!res.ok) throw new Error("Impersonation failed");
      router.push("/admin");
    } catch {
      notify("Unable to open venue admin workspace", "error");
      setBusyTenantId(null);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  return (
    <div className="min-h-dvh bg-[#FAFAFA] text-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white">
        <div className="mx-auto flex h-14 max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-950 text-white">
              <Shield className="h-3.5 w-3.5" strokeWidth={1.5} />
            </span>
            <div>
              <p className="text-[14px] font-semibold tracking-[-0.02em] text-zinc-950">
                MenuOS · Super Admin
              </p>
              <p className="hidden text-[11px] text-zinc-500 sm:block">
                Platform governance · {user.email}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setProvisionMounted(true);
                setProvisionOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-md bg-zinc-950 px-3.5 py-1.5 text-[13px] font-medium text-white hover:bg-zinc-800"
            >
              <Plus className="h-3.5 w-3.5" strokeWidth={1.5} />
              New venue
            </button>
            <button
              type="button"
              onClick={() => void handleLogout()}
              aria-label="Sign out"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-100 hover:text-zinc-950"
            >
              <LogOut className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] space-y-6 px-4 py-6 sm:px-6">
        {/* Disciplined Swiss Typographic Summary Strip (Zero fake sparklines) */}
        <section
          aria-label="Platform metrics"
          className="grid grid-cols-2 divide-y divide-zinc-200 overflow-hidden rounded-xl border border-zinc-200 bg-white sm:grid-cols-4 sm:divide-x sm:divide-y-0"
        >
          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              Onboarded Venues
            </p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-zinc-950">
              {data.totals.totalTenants}
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              Active / Suspended
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
              Published Items
            </p>
            <p className="mt-1 text-[24px] font-semibold tabular-nums tracking-[-0.02em] text-zinc-950">
              {data.totals.totalItems}
            </p>
          </div>

          <div className="px-4 py-3.5">
            <p className="text-[11px] font-medium uppercase tracking-[0.06em] text-zinc-500">
              QR Scans (7d / Total)
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
                Tenant Directory
              </h1>
              <p className="text-[12px] text-zinc-500">
                Inspect live mobile menus, troubleshoot admin workspaces, or
                suspend tenant access.
              </p>
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
                  placeholder="Search venue, slug, owner..."
                  aria-label="Search tenants"
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
                      ? "All"
                      : status === "ACTIVE"
                        ? "Active"
                        : "Suspended"}
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
              <caption className="sr-only">
                Directory of onboarded multi-tenant venues
              </caption>
              <thead className="border-b border-zinc-200 bg-[#FAFAFA] text-[11px] font-semibold uppercase tracking-[0.05em] text-zinc-500">
                <tr>
                  <th scope="col" className="px-4 py-2.5">
                    Venue
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Owner
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Mode
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Items
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    QR Scans
                  </th>
                  <th scope="col" className="px-4 py-2.5">
                    Created
                  </th>
                  <th scope="col" className="px-4 py-2.5 text-right">
                    Actions
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
                      No venues match your filter.
                    </td>
                  </tr>
                ) : (
                  filteredTenants.map((tenant) => {
                    const isBusy = busyTenantId === tenant.id;
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
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-950">
                                {tenant.name}
                              </p>
                              <p className="font-mono text-[11px] text-zinc-500">
                                /m/{tenant.slug}
                              </p>
                            </div>
                          </div>
                        </th>

                        <td
                          data-label="Owner"
                          className="px-4 py-3 text-zinc-600"
                        >
                          {tenant.ownerEmail ?? (
                            <span className="text-zinc-400">Unassigned</span>
                          )}
                        </td>

                        <td data-label="Status" className="px-4 py-3">
                          {tenant.status === "ACTIVE" ? (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-[11px] font-medium text-zinc-900">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" />
                              ACTIVE
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-md border border-zinc-200 bg-zinc-100 px-2 py-0.5 text-[11px] font-medium text-zinc-500">
                              <span className="h-1.5 w-1.5 rounded-full bg-zinc-400" />
                              SUSPENDED
                            </span>
                          )}
                        </td>

                        <td data-label="Mode" className="px-4 py-3">
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
                            title="Click to switch storefront mode"
                            className="inline-flex items-center rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:bg-white disabled:opacity-40"
                          >
                            {tenant.vendorMode === "CART"
                              ? "Add to Cart"
                              : "Listing Only"}
                          </button>
                        </td>

                        <td
                          data-label="Items"
                          className="px-4 py-3 text-right tabular-nums text-zinc-800"
                        >
                          {tenant.itemCount}
                        </td>

                        <td
                          data-label="QR Scans"
                          className="px-4 py-3 text-right tabular-nums text-zinc-800"
                        >
                          <span className="font-medium">{tenant.scanCount}</span>
                          <span className="ml-1 text-[11px] text-zinc-400">
                            ({tenant.scansLast7Days} 7d)
                          </span>
                        </td>

                        <td
                          data-label="Created"
                          className="px-4 py-3 tabular-nums text-zinc-500"
                        >
                          {formatDate(tenant.createdAt)}
                        </td>

                        <td data-label="Actions" className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            <Link
                              href={`/m/${tenant.slug}`}
                              target="_blank"
                              title="Inspect live mobile menu"
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950"
                            >
                              Live
                              <ExternalLink
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                            </Link>

                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => void handleImpersonate(tenant)}
                              title="Impersonate Menu Admin"
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40"
                            >
                              <Settings2
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                              Manage
                            </button>

                            {tenant.status === "ACTIVE" ? (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() => setConfirmSuspendTenant(tenant)}
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-40"
                              >
                                <PauseCircle
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                                Suspend
                              </button>
                            ) : (
                              <button
                                type="button"
                                disabled={isBusy}
                                onClick={() =>
                                  void updateTenantStatus(tenant, "ACTIVE")
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-950 bg-zinc-950 px-2.5 py-1 text-[12px] font-medium text-white hover:bg-zinc-800 disabled:opacity-40"
                              >
                                <PlayCircle
                                  className="h-3.5 w-3.5"
                                  strokeWidth={1.5}
                                />
                                Activate
                              </button>
                            )}
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
              QR Scan Activity Summary
            </h2>
            <p className="text-[12px] text-zinc-500">
              Non-blocking scan volume by venue and top table codes.
            </p>
          </div>

          <div className="divide-y divide-zinc-200">
            {data.analytics.map((row) => {
              const barWidthPct = Math.max(
                4,
                Math.round((row.totalScans / maxScans) * 100)
              );
              return (
                <div
                  key={row.tenantId}
                  className="grid grid-cols-1 gap-3 px-4 py-3.5 md:grid-cols-[220px_1fr_240px] md:items-center"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full border border-black/15"
                      style={{ backgroundColor: row.primaryColor }}
                      aria-hidden="true"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[13px] font-semibold text-zinc-950">
                        {row.tenantName}
                      </p>
                      <p className="font-mono text-[11px] text-zinc-400">
                        /m/{row.slug}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="tabular-nums font-medium text-zinc-900">
                        {row.totalScans} total scans
                      </span>
                      <span className="tabular-nums text-zinc-500">
                        {row.last7Days} in last 7d
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
                      row.topTables.map((t) => (
                        <span
                          key={t.tableCode}
                          className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] tabular-nums text-zinc-600"
                        >
                          T-{t.tableCode}: {t.count}
                        </span>
                      ))
                    ) : (
                      <span className="text-[11px] text-zinc-400">
                        No table tags yet
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
            notify("New venue provisioned and ready");
          }}
        />
      )}

      {/* Suspend Tenant Confirmation */}
      <NativeDialog
        open={Boolean(confirmSuspendTenant)}
        onClose={() => setConfirmSuspendTenant(null)}
        title="Suspend venue menu?"
        subtitle="Immediate platform governance control."
        maxWidthClass="max-w-sm"
      >
        <div className="p-5">
          <p className="text-[14px] leading-relaxed text-zinc-700">
            Suspending{" "}
            <strong className="font-semibold text-zinc-950">
              {confirmSuspendTenant?.name}
            </strong>{" "}
            immediately replaces{" "}
            <code className="font-mono text-[12px]">
              /m/{confirmSuspendTenant?.slug}
            </code>{" "}
            with a neutral &ldquo;Menu temporarily unavailable&rdquo; screen on
            QR scans.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              autoFocus
              onClick={() => setConfirmSuspendTenant(null)}
              className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() =>
                confirmSuspendTenant &&
                void updateTenantStatus(confirmSuspendTenant, "SUSPENDED")
              }
              className="rounded-md bg-red-600 px-3.5 py-2 text-[13px] font-medium text-white hover:bg-red-700"
            >
              Suspend venue
            </button>
          </div>
        </div>
      </NativeDialog>

      <Toast message={toast} onDismiss={() => setToast(null)} />
    </div>
  );
}
