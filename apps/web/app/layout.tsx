import type { Metadata, Viewport } from "next";
import { Familjen_Grotesk, JetBrains_Mono } from "next/font/google";
import type { ReactNode } from "react";

import "./globals.css";

const familjen = Familjen_Grotesk({
  subsets: ["latin"],
  variable: "--font-familjen",
  display: "swap"
});

const jetBrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap"
});

export const metadata: Metadata = {
  title: { default: "Utsikt", template: "%s · Utsikt" },
  description: "A calm control panel for decisions, commitments, and prepared actions."
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#F4EFE0"
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html className={`${familjen.variable} ${jetBrains.variable}`} lang="en">
      <body>{children}</body>
    </html>
  );
}
