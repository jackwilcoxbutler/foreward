"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, LogOut, Trash2 } from "lucide-react";
import { useAuth } from "./AuthProvider";

export function AccountWorkspace() {
  const router = useRouter();
  const { loading, session, user, signOut } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  if (loading) return <section className="workspace-card empty-state">Loading your account…</section>;
  if (!user || !session) return <section className="workspace-card empty-state"><h2>Log in to manage your account.</h2><Link className="button button-primary" href="/login?returnTo=/account">Log in</Link></section>;

  async function deleteAccount() {
    if (!session || !window.confirm("Delete your account, rounds, and saved courses? This cannot be undone.")) return;
    setDeleting(true);
    setError(null);
    const response = await fetch("/api/account", { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Account deletion failed.");
      setDeleting(false);
      return;
    }
    await signOut();
    router.replace("/");
  }

  return (
    <div className="account-workspace">
      <section className="workspace-card account-summary"><span>Email</span><strong>{user.email}</strong><small>Free plan · Sharing and editing stay unlimited</small></section>
      <section className="workspace-card account-actions"><h2>Account</h2><Link href="/forgot-password">Reset password</Link><button type="button" onClick={async () => { await signOut(); router.replace("/"); }}><LogOut size={18} /> Log out</button></section>
      <section className="workspace-card danger-zone"><h2>Delete account</h2><p>Permanently removes your rounds and saved courses.</p>{error && <div className="inline-alert"><AlertCircle size={18} />{error}</div>}<button disabled={deleting} type="button" onClick={deleteAccount}><Trash2 size={17} />{deleting ? "Deleting…" : "Delete account"}</button></section>
    </div>
  );
}
