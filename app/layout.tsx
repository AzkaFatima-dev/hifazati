import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hifazati — Lahore ride safety reports",
  description: "Privately report a ride concern and see reviewed community trends in Lahore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
