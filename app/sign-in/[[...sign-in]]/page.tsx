import { SignIn } from "@clerk/nextjs";
import Link from "next/link";

export default function SignInPage() {
  return <main className="clerk-auth-page"><Link href="/" className="clerk-auth-home">← Hifazati</Link><SignIn fallbackRedirectUrl="/dashboard" /></main>;
}
