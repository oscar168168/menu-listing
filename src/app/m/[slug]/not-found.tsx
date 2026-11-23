import Link from "next/link";
import { FileX2 } from "lucide-react";

export default function MenuNotFound() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-[480px] flex-col items-center justify-center bg-white px-6 text-center sm:border-x sm:border-zinc-200">
      <div className="flex h-11 w-11 items-center justify-center rounded-full border border-zinc-200 bg-[#FAFAFA] text-zinc-500">
        <FileX2 className="h-5 w-5" strokeWidth={1.5} />
      </div>
      <h1 className="mt-4 text-[18px] font-semibold tracking-[-0.02em] text-zinc-950">
        Menu not found
      </h1>
      <p className="mt-2 max-w-[300px] text-[13px] leading-relaxed text-zinc-500">
        The QR code or venue link you followed doesn&apos;t match an active menu
        on this platform.
      </p>
      <Link
        href="/"
        className="mt-6 rounded-md border border-zinc-200 bg-zinc-950 px-4 py-2 text-[13px] font-medium text-white hover:bg-zinc-800"
      >
        Return home
      </Link>
    </div>
  );
}
