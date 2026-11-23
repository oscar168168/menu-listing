"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Lock } from "lucide-react";

const DEMO_ACCOUNTS = [
  {
    label: "Super Admin",
    role: "Platform Governance",
    email: "admin@menuos.app",
    pass: "Admin123!",
  },
  {
    label: "Sora Seafood Grill · សូរ៉ា",
    role: "USD + KHR (#1E293B)",
    email: "owner@soraseafood.com",
    pass: "Menu123!",
  },
  {
    label: "Kep Bay Kitchen · ផ្ទះបាយឆ្នេរកែប",
    role: "KHR + USD (#B45309)",
    email: "chef@kepbaykitchen.com",
    pass: "Menu123!",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await res.json()) as {
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !data.redirectTo) {
        throw new Error(data.error ?? "Sign-in failed");
      }
      router.push(data.redirectTo);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Invalid credentials");
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col justify-between bg-[#FAFAFA] px-4 py-8">
      <div className="mx-auto w-full max-w-[420px]">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-950"
        >
          <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
          Back to MenuOS
        </Link>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-2.5">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-zinc-200 bg-[#FAFAFA] text-zinc-900">
              <Lock className="h-4 w-4" strokeWidth={1.5} />
            </span>
            <div>
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-zinc-950">
                Sign in to MenuOS
              </h1>
              <p className="text-[12px] text-zinc-500">
                Menu Admin &amp; Super Admin portal access
              </p>
            </div>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="login-email"
                className="block text-[12px] font-medium text-zinc-700"
              >
                Email
              </label>
              <input
                id="login-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@venue.com"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
              />
            </div>

            <div>
              <label
                htmlFor="login-password"
                className="block text-[12px] font-medium text-zinc-700"
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
              />
            </div>

            {error && (
              <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              {loading ? "Signing in..." : "Sign in"}
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>

        {/* Seeded Demo Accounts */}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
            Seeded Demo Credentials (click to fill)
          </p>
          <div className="mt-2.5 divide-y divide-zinc-100">
            {DEMO_ACCOUNTS.map((acct) => (
              <button
                key={acct.email}
                type="button"
                onClick={() => {
                  setEmail(acct.email);
                  setPassword(acct.pass);
                  setError(null);
                }}
                className="flex w-full items-center justify-between gap-2 py-2 text-left transition-colors hover:text-zinc-950"
              >
                <div className="min-w-0">
                  <p
                    lang="km"
                    className="truncate text-[13px] font-medium text-zinc-900"
                  >
                    {acct.label}
                  </p>
                  <p className="font-mono text-[11px] text-zinc-500">
                    {acct.email}
                  </p>
                </div>
                <span className="shrink-0 rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] text-zinc-600">
                  {acct.role}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-zinc-400">
        MenuOS · Cambodian F&amp;B &amp; Seafood Digital Menu Platform
      </p>
    </div>
  );
}
