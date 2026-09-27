import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hifazati — Lahore ride safety reports",
  description: "Privately report a ride concern and see reviewed community trends in Lahore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body><ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" appearance={{ variables: { colorPrimary: "#bb484d" } }}>{children}</ClerkProvider></body>
    </html>
  );
}
