import { SignUp } from "@clerk/nextjs";
import Link from "next/link";

export default function SignUpPage() {
  return <main className="clerk-auth-page"><Link href="/" className="clerk-auth-home">← Hifazati</Link><SignUp fallbackRedirectUrl="/dashboard" /></main>;
}
