"use client";

import { useCallback, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ExternalLink,
  LogOut,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  Search,
  Settings2,
  Shield,
} from "lucide-react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { Toast, type ToastMessage } from "@/components/ui/Toast";
import { slugify } from "@/lib/slug";
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
  const [editingTenant, setEditingTenant] =
    useState<SuperAdminTenantSummary | null>(null);
  const [editSlug, setEditSlug] = useState("");
  const [editNameEn, setEditNameEn] = useState("");
  const [editNameKm, setEditNameKm] = useState("");
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [busyTenantId, setBusyTenantId] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

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
      setEditError(
        "Slug must be at least 2 lowercase letters/numbers (e.g. pak-khlang-168)."
      );
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
          name: editNameEn.trim() || editNameKm.trim() || editingTenant.name,
          nameEn: editNameEn.trim(),
          nameKm: editNameKm.trim(),
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
        throw new Error(json.error ?? "Failed to update venue");
      }

      const updated = json.tenant;
      setData((prev) => ({
        ...prev,
        tenants: prev.tenants.map((t) =>
          t.id === updated.id
            ? {
                ...t,
                slug: updated.slug,
                name: updated.name,
                nameEn: updated.nameEn,
                nameKm: updated.nameKm,
              }
            : t
        ),
        analytics: prev.analytics.map((a) =>
          a.tenantId === updated.id
            ? {
                ...a,
                slug: updated.slug,
                tenantName: updated.name,
              }
            : a
        ),
      }));

      setEditingTenant(null);
      notify(`Updated "${updated.name}" (/m/${updated.slug})`);
    } catch (err) {
      setEditError(
        err instanceof Error ? err.message : "Could not update venue"
      );
    } finally {
      setEditSaving(false);
    }
  };

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
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    Venue
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    Owner
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    Status
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    Mode
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-right"
                  >
                    Items
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-right"
                  >
                    QR Scans
                  </th>
                  <th scope="col" className="whitespace-nowrap px-4 py-2.5">
                    Created
                  </th>
                  <th
                    scope="col"
                    className="whitespace-nowrap px-4 py-2.5 text-right"
                  >
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
                            <div className="min-w-0 max-w-[240px] lg:max-w-[280px]">
                              <p className="truncate text-[13.5px] font-semibold text-zinc-950">
                                {tenant.nameKm ? (
                                  <span lang="km">{tenant.nameKm}</span>
                                ) : (
                                  tenant.name
                                )}
                              </p>
                              <div className="mt-0.5 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                                {tenant.nameKm &&
                                  tenant.nameEn &&
                                  tenant.nameEn !== tenant.nameKm && (
                                    <span className="truncate text-[11.5px] text-zinc-500">
                                      {tenant.nameEn}
                                    </span>
                                  )}
                                <button
                                  type="button"
                                  onClick={() => openEditTenantModal(tenant)}
                                  title="Click to edit URL slug / subdomain path"
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
                          data-label="Owner"
                          className="whitespace-nowrap px-4 py-3 text-zinc-600"
                        >
                          {tenant.ownerEmail ?? (
                            <span className="text-zinc-400">Unassigned</span>
                          )}
                        </td>

                        <td
                          data-label="Status"
                          className="whitespace-nowrap px-4 py-3"
                        >
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

                        <td
                          data-label="Mode"
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
                            title="Click to switch storefront mode"
                            className="inline-flex items-center whitespace-nowrap rounded-md border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] font-medium text-zinc-700 hover:border-zinc-400 hover:bg-white disabled:opacity-40"
                          >
                            {tenant.vendorMode === "CART"
                              ? "Add to Cart"
                              : "Listing Only"}
                          </button>
                        </td>

                        <td
                          data-label="Items"
                          className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800"
                        >
                          {tenant.itemCount}
                        </td>

                        <td
                          data-label="QR Scans"
                          className="whitespace-nowrap px-4 py-3 text-right tabular-nums text-zinc-800"
                        >
                          <span className="font-medium">{tenant.scanCount}</span>
                          <span className="ml-1 text-[11px] text-zinc-400">
                            ({tenant.scansLast7Days} 7d)
                          </span>
                        </td>

                        <td
                          data-label="Created"
                          className="whitespace-nowrap px-4 py-3 tabular-nums text-zinc-500"
                        >
                          {formatDate(tenant.createdAt)}
                        </td>

                        <td
                          data-label="Actions"
                          className="whitespace-nowrap px-4 py-3"
                        >
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              disabled={isBusy}
                              onClick={() => openEditTenantModal(tenant)}
                              title="Edit URL slug & venue name"
                              className="inline-flex items-center gap-1 rounded-md border border-zinc-200 bg-white px-2.5 py-1 text-[12px] font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-950 disabled:opacity-40"
                            >
                              <Pencil
                                className="h-3 w-3"
                                strokeWidth={1.5}
                              />
                              Edit
                            </button>

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

      {/* Edit Venue & URL Slug Modal */}
      <NativeDialog
        open={Boolean(editingTenant)}
        onClose={() => setEditingTenant(null)}
        title="Edit Venue & URL Slug"
        subtitle="Update public menu URL path (/m/slug) and bilingual venue names."
        maxWidthClass="max-w-md"
      >
        <form
          onSubmit={(e) => void handleSaveTenantEdit(e)}
          className="p-5 space-y-4"
        >
          <div>
            <label
              htmlFor="edit-tenant-slug"
              className="block text-[12px] font-medium text-zinc-700"
            >
              URL Slug / Subdomain Path
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
                placeholder="pak-khlang-168"
                autoFocus
                className="w-full bg-transparent py-2 pr-3 font-mono text-[13.5px] text-zinc-950 focus:outline-none"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
              <span>Suggestions:</span>
              {["pak-khlang-168", "somros-pak-khlang-168", slugify(editNameEn)]
                .filter(
                  (s, idx, arr) => s.length >= 2 && arr.indexOf(s) === idx
                )
                .map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setEditSlug(s)}
                    className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] text-zinc-700 hover:border-zinc-400 hover:bg-zinc-100"
                  >
                    /m/{s}
                  </button>
                ))}
            </div>
          </div>

          <div>
            <label
              htmlFor="edit-tenant-name-km"
              lang="km"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Venue Name (Khmer ខ្មែរ)
            </label>
            <input
              id="edit-tenant-name-km"
              type="text"
              lang="km"
              maxLength={100}
              value={editNameKm}
              onChange={(e) => setEditNameKm(e.target.value)}
              placeholder="សម្រស់ឆ្នេរប៉ាក់ខ្លង 168"
              className="mt-1 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-[13.5px] text-zinc-950 focus:border-zinc-950 focus:outline-none"
            />
          </div>

          <div>
            <label
              htmlFor="edit-tenant-name-en"
              className="block text-[12px] font-medium text-zinc-700"
            >
              Venue Name (English)
            </label>
            <input
              id="edit-tenant-name-en"
              type="text"
              required={!editNameKm.trim()}
              maxLength={100}
              value={editNameEn}
              onChange={(e) => setEditNameEn(e.target.value)}
              placeholder="Somros Chhne Pak Khlang 168"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={editSaving}
              className="rounded-md bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              {editSaving ? "Saving..." : "Save changes"}
            </button>
          </div>
        </form>
      </NativeDialog>

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
