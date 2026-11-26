"use client";

import { useState } from "react";
import { NativeDialog } from "@/components/ui/NativeDialog";
import { NativeSwitch } from "@/components/ui/NativeSwitch";
import { PORTAL_COPY } from "@/lib/portal-i18n";
import type { Locale, SerializedCategory } from "@/types/menu";

interface CategoryModalProps {
  open: boolean;
  locale: Locale;
  editingCategory: SerializedCategory | null;
  onClose: () => void;
  onSave: (payload: {
    nameEn: string;
    nameKm: string;
    isVisible: boolean;
  }) => Promise<void>;
}

function CategoryForm({
  locale,
  editingCategory,
  onClose,
  onSave,
}: Omit<CategoryModalProps, "open">) {
  const t = PORTAL_COPY[locale].admin;
  const c = PORTAL_COPY[locale].common;

  const [nameKm, setNameKm] = useState(editingCategory?.nameKm ?? "");
  const [nameEn, setNameEn] = useState(
    editingCategory?.nameEn ?? editingCategory?.name ?? ""
  );
  const [isVisible, setIsVisible] = useState(
    editingCategory?.isVisible ?? true
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKm = nameKm.trim();
    const cleanEn = nameEn.trim();
    if (!cleanKm && !cleanEn) {
      setError(t.catValidationError);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await onSave({ nameEn: cleanEn, nameKm: cleanKm, isVisible });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : c.unknownError);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form
      lang={locale}
      onSubmit={(e) => void handleSubmit(e)}
      className="p-5 space-y-4"
    >
      <div>
        <label
          htmlFor="category-name-km"
          className="block text-[12px] font-medium text-zinc-700"
        >
          {t.catNameKmLabel}
        </label>
        <input
          id="category-name-km"
          type="text"
          lang="km"
          maxLength={80}
          value={nameKm}
          onChange={(e) => setNameKm(e.target.value)}
          placeholder={t.catNameKmPlaceholder}
          autoFocus
          className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
        />
      </div>

      <div>
        <label
          htmlFor="category-name-en"
          className="block text-[12px] font-medium text-zinc-700"
        >
          {t.catNameEnLabel}
        </label>
        <input
          id="category-name-en"
          type="text"
          maxLength={80}
          value={nameEn}
          onChange={(e) => setNameEn(e.target.value)}
          placeholder={t.catNameEnPlaceholder}
          className="mt-1.5 w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-[14px] text-zinc-950 placeholder:text-zinc-400 focus:border-brand focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-zinc-500">{t.catFallbackHint}</p>
      </div>

      <div className="flex items-center justify-between rounded-lg border border-zinc-200 bg-[#FAFAFA] px-3.5 py-2.5">
        <div>
          <p className="text-[13px] font-medium text-zinc-900">
            {t.catVisibleLabel}
          </p>
          <p className="text-[12px] text-zinc-500">{t.catVisibleHint}</p>
        </div>
        <NativeSwitch
          checked={isVisible}
          onChange={setIsVisible}
          label={t.catVisibleLabel}
          srOnlyLabel
        />
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700">
          {error}
        </p>
      )}

      <div className="flex items-center justify-end gap-2 border-t border-zinc-200 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="rounded-md border border-zinc-200 bg-white px-3.5 py-2 text-[13px] font-medium text-zinc-700 hover:bg-zinc-100"
        >
          {c.cancel}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-md bg-brand px-4 py-2 text-[13px] font-medium transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting
            ? c.saving
            : editingCategory
              ? c.saveChanges
              : t.catCreateBtn}
        </button>
      </div>
    </form>
  );
}

export function CategoryModal({
  open,
  locale,
  editingCategory,
  onClose,
  onSave,
}: CategoryModalProps) {
  const t = PORTAL_COPY[locale].admin;
  const c = PORTAL_COPY[locale].common;

  return (
    <NativeDialog
      open={open}
      onClose={onClose}
      title={editingCategory ? t.catModalEditTitle : t.catModalNewTitle}
      subtitle={t.catModalSubtitle}
      closeLabel={c.closeDialog}
      maxWidthClass="max-w-md"
    >
      {open && (
        <CategoryForm
          key={editingCategory?.id ?? "new-category"}
          locale={locale}
          editingCategory={editingCategory}
          onClose={onClose}
          onSave={onSave}
        />
      )}
    </NativeDialog>
  );
}
