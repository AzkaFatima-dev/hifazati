import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Raahnaama — Lahore ride experiences",
  description: "Share ride experiences privately and explore community patterns across Lahore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
