import type { Metadata, Viewport } from "next";
import { Inter, Kantumruy_Pro } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const kantumruyPro = Kantumruy_Pro({
  subsets: ["khmer"],
  variable: "--font-kantumruy",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "ChhneQR (ឆ្នេរ QR) — Digital QR Menu Platform",
    template: "%s · ChhneQR",
  },
  description:
    "ChhneQR (ឆ្នេរ QR) — Bilingual Khmer & English digital QR menu platform for restaurants, seafood venues, and cafés.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#FFFFFF",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${kantumruyPro.variable}`}>
      <body className="min-h-dvh bg-[#FAFAFA] text-[#09090B] antialiased selection:bg-zinc-900 selection:text-white">
        {children}
      </body>
    </html>
  );
}
