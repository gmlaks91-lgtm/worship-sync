"use client";

import { Geist } from "next/font/google";

import { RouteErrorView } from "@/components/error/route-error-view";

import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full`}>
      <body className="flex min-h-full flex-col bg-slate-50 font-sans text-slate-800 antialiased">
        <RouteErrorView error={error} reset={reset} boundary="global" fullPage />
      </body>
    </html>
  );
}
