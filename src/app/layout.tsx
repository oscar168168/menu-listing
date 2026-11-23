import type { Metadata, Viewport } from "next";
import { Inter, Kantumruy_Pro } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const kantumruyPro = Kantumruy_Pro({
  subsets: ["khmer", "latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-kantumruy",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "MenuOS — Minimalist Digital Menu Platform",
    template: "%s · MenuOS",
  },
  description:
    "Bilingual Khmer & English multi-tenant QR digital menu platform built for Cambodian restaurants, seafood venues, and sub-second mobile browsing.",
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
