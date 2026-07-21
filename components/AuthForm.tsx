"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowRight, LoaderCircle } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

export function LoginForm({ returnTo = "/my-rounds" }: { returnTo?: string }) {
  const router = useRouter();
  const { configured, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) router.replace(returnTo);
  }, [returnTo, router, user]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return setError("Supabase Auth still needs to be connected.");
    setSubmitting(true);
    setError(null);
    const { error: authError } = await getSupabaseBrowserClient().auth.signInWithPassword({ email, password });
    if (authError) {
      setError(authError.message);
      setSubmitting(false);
      return;
    }
    router.replace(returnTo);
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      <label>Password<input type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {error && <div className="inline-alert" role="alert"><AlertCircle size={18} />{error}</div>}
      <button className="button button-primary button-large button-full" disabled={submitting} type="submit">
        {submitting ? <><LoaderCircle className="spin" size={19} /> Logging in…</> : <>Log in <ArrowRight size={18} /></>}
      </button>
      <div className="auth-form-links"><Link href="/forgot-password">Forgot password?</Link><Link href="/create">Create a round first</Link></div>
    </form>
  );
}

export function ForgotPasswordForm() {
  const { configured } = useAuth();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return setMessage("Supabase Auth still needs to be connected.");
    setSubmitting(true);
    const redirectTo = `${window.location.origin}/reset-password`;
    const { error } = await getSupabaseBrowserClient().auth.resetPasswordForEmail(email, { redirectTo });
    setMessage(error ? error.message : "Check your email for a secure password reset link.");
    setSubmitting(false);
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>Email<input type="email" autoComplete="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
      {message && <div className="inline-alert" role="status">{message}</div>}
      <button className="button button-primary button-large button-full" disabled={submitting} type="submit">
        {submitting ? <><LoaderCircle className="spin" size={19} /> Sending…</> : "Send reset link"}
      </button>
      <div className="auth-form-links"><Link href="/login">Back to login</Link></div>
    </form>
  );
}

export function ResetPasswordForm() {
  const router = useRouter();
  const { configured } = useAuth();
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!configured) return setMessage("Supabase Auth still needs to be connected.");
    if (password.length < 8) return setMessage("Use at least 8 characters.");
    setSubmitting(true);
    const { error } = await getSupabaseBrowserClient().auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setSubmitting(false);
      return;
    }
    router.replace("/account?password=updated");
  }

  return (
    <form className="auth-form" onSubmit={submit}>
      <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} /></label>
      {message && <div className="inline-alert" role="status">{message}</div>}
      <button className="button button-primary button-large button-full" disabled={submitting} type="submit">
        {submitting ? <><LoaderCircle className="spin" size={19} /> Updating…</> : "Update password"}
      </button>
    </form>
  );
}
