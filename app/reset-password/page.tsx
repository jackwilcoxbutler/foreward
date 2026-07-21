import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { ResetPasswordForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Choose a new password" };

export default function ResetPasswordPage() {
  return <main className="account-page"><AppHeader /><section className="auth-card"><p className="eyebrow">Secure your account</p><h1>Choose a new password.</h1><p>Use at least eight characters.</p><ResetPasswordForm /></section></main>;
}
