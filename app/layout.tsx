import Script from "next/script";
import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hifazati",
  description: "Privately report a ride concern and see reviewed community trends in Lahore.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
  <head>
    <Script
      src="https://clarino.ai/agent.js"
      data-workspace="user-user_3l0zcslu0bpsydsbhbzud4vvrid"
      data-sources="src-1gphguy,src-10t7cjo,src-1hm8gsb,src-1vnv7oy,src-1jsadj4,src-apsqoq,src-13g7us3,src-yt82ev,src-oy7h4c,src-sb92zg,src-qissof,src-48zbci"
      data-accent="#4f46e5"
      data-position="bottom-right"
      data-launcher="Ask us anything"
      data-greeting="Hi there! 👋 How can I help you today?"
      data-theme="auto"
      strategy="afterInteractive"
        />
  </head>
      <body><ClerkProvider signInUrl="/sign-in" signUpUrl="/sign-up" signInFallbackRedirectUrl="/dashboard" signUpFallbackRedirectUrl="/dashboard" appearance={{ variables: { colorPrimary: "#bb484d" } }}>{children}</ClerkProvider></body>
    </html>
  );
}
