import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { LoginForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const { returnTo } = await searchParams;
  const safeReturnTo = returnTo?.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/my-rounds";
  return <main className="account-page"><AppHeader /><section className="auth-card"><p className="eyebrow">Welcome back</p><h1>Your rounds are waiting.</h1><p>Log in with the email and password you used to save your first round.</p><LoginForm returnTo={safeReturnTo} /></section></main>;
}
