import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ForgotPasswordForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return <main className="account-page"><AppHeader /><section className="auth-card"><p className="eyebrow">Password reset</p><h1>Let’s get you back in.</h1><p>We’ll email you a secure link to choose a new password.</p><ForgotPasswordForm /></section></main>;
}
