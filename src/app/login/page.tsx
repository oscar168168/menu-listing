"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Eye, EyeOff } from "lucide-react";
import { ChhneQrMark } from "@/components/ui/ChhneQrLogo";
import {
  PortalLanguageSwitcher,
  usePortalLocale,
} from "@/components/ui/PortalLanguageSwitcher";
import { PORTAL_COPY } from "@/lib/portal-i18n";

export default function LoginPage() {
  const router = useRouter();
  const [locale, setLocale] = usePortalLocale("km");
  const t = PORTAL_COPY[locale].login;
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
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
        body: JSON.stringify({ identifier, password }),
      });
      const data = (await res.json()) as {
        redirectTo?: string;
        error?: string;
      };
      if (!res.ok || !data.redirectTo) {
        throw new Error(
          res.status === 401
            ? t.invalidCredentials
            : data.error ?? t.signInFailed
        );
      }
      router.push(data.redirectTo);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.invalidCredentials);
      setLoading(false);
    }
  };

  return (
    <div
      lang={locale}
      className="flex min-h-dvh flex-col justify-between bg-[#FAFAFA] px-4 py-8"
    >
      <div className="mx-auto w-full max-w-[420px]">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-[12px] font-medium text-zinc-500 hover:text-zinc-950"
          >
            <ArrowLeft className="h-3.5 w-3.5" strokeWidth={1.5} />
            <span>{t.backToHome}</span>
          </Link>

          <PortalLanguageSwitcher
            locale={locale}
            onChange={setLocale}
            compact
          />
        </div>

        <div className="mt-6 rounded-xl border border-zinc-200 bg-white p-6">
          <div className="flex items-center gap-3">
            <ChhneQrMark size={38} />
            <div>
              <h1 className="text-[18px] font-semibold tracking-[-0.02em] text-zinc-950">
                {t.title}
              </h1>
              <p className="text-[12px] text-zinc-500">{t.subtitle}</p>
            </div>
          </div>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-6 space-y-4"
          >
            <div>
              <label
                htmlFor="login-identifier"
                className="block text-[12px] font-medium text-zinc-700"
              >
                {t.identifierLabel}
              </label>
              <input
                id="login-identifier"
                name="username"
                type="text"
                required
                autoComplete="username"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                enterKeyHint="next"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  if (error) setError(null);
                }}
                placeholder={t.identifierPlaceholder}
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label
                  htmlFor="login-password"
                  className="block text-[12px] font-medium text-zinc-700"
                >
                  {t.passwordLabel}
                </label>
                <button
                  type="button"
                  aria-pressed={showPassword}
                  aria-label={showPassword ? t.hidePassword : t.showPassword}
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="inline-flex items-center gap-1 text-[11.5px] font-medium text-zinc-500 hover:text-zinc-900"
                >
                  {showPassword ? (
                    <>
                      <EyeOff className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{t.hidePassword}</span>
                    </>
                  ) : (
                    <>
                      <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                      <span>{t.showPassword}</span>
                    </>
                  )}
                </button>
              </div>
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                enterKeyHint="done"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="••••••••"
                className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-zinc-950 focus:outline-none"
              />
            </div>

            {error && (
              <p
                role="status"
                className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-1.5 rounded-md bg-zinc-950 px-4 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-zinc-800 disabled:opacity-50"
            >
              <span>{loading ? t.signingIn : t.signIn}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </form>
        </div>

        {/* Seeded Demo Accounts */}
        <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-zinc-500">
            {t.demoTitle}
          </p>
          <div className="mt-2.5 divide-y divide-zinc-100">
            {t.demoAccounts.map((acct) => (
              <div
                key={acct.username}
                className="flex flex-wrap items-center justify-between gap-2 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-zinc-900">
                    {acct.label}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier(acct.username);
                        setPassword(acct.pass);
                        setError(null);
                      }}
                      className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100"
                    >
                      {t.userPrefix} {acct.username}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIdentifier(acct.phone);
                        setPassword(acct.pass);
                        setError(null);
                      }}
                      className="rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 font-mono text-[11px] font-medium text-zinc-800 hover:border-zinc-400 hover:bg-zinc-100"
                    >
                      {t.phonePrefix} {acct.phone}
                    </button>
                  </div>
                </div>
                <span className="shrink-0 rounded border border-zinc-200 bg-[#FAFAFA] px-2 py-0.5 text-[11px] text-zinc-600">
                  {acct.role}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <p className="mt-8 text-center text-[11px] text-zinc-400">{t.footer}</p>
    </div>
  );
}
