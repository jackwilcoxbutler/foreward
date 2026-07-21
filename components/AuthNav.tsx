"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export function AuthNav() {
  const { loading, user } = useAuth();

  if (loading) return <span className="nav-loading" aria-label="Loading account" />;

  if (!user) {
    return (
      <>
        <Link className="nav-info-link" href="/#how-it-works">How it works</Link>
        <Link className="nav-login-link" href="/login">Log in</Link>
        <Link className="button button-small button-dark" href="/create">Create a round</Link>
      </>
    );
  }

  return (
    <>
      <Link className="desktop-account-link" href="/my-rounds">My Rounds</Link>
      <Link className="desktop-account-link" href="/saved-courses">Saved Courses</Link>
      <Link className="desktop-account-link" href="/account">Account</Link>
      <details className="mobile-account-menu"><summary>Menu</summary><div><Link href="/my-rounds">My Rounds</Link><Link href="/saved-courses">Saved Courses</Link><Link href="/account">Account</Link></div></details>
      <Link className="button button-small button-dark" href="/create">New round</Link>
    </>
  );
}
