import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { AccountWorkspace } from "@/components/AccountWorkspace";

export const metadata: Metadata = { title: "Account" };

export default function AccountPage() {
  return <main className="dashboard-page"><AppHeader /><div className="dashboard-shell"><div className="dashboard-heading"><p className="eyebrow">Your profile</p><h1>Account</h1></div><AccountWorkspace /></div></main>;
}
