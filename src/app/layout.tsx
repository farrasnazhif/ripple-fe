import type { Metadata } from "next";
import { AppProviders } from "@/components/app-providers";
import "./globals.css";
import { Manrope } from "next/font/google";
import { cn } from "@/lib/utils";

const manrope = Manrope({ subsets: ["latin"], variable: "--font-manrope" });

export const metadata: Metadata = {
  title: "Ripple",
  description: "Trace the impact of every creative change.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={cn("font-sans", manrope.variable)}>
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
