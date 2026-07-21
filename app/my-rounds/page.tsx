import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { RoundsHistory } from "@/components/RoundsHistory";

export const metadata: Metadata = { title: "My Rounds" };

export default function MyRoundsPage() {
  return <main className="dashboard-page"><AppHeader /><div className="dashboard-shell"><div className="dashboard-heading"><p className="eyebrow">Your Golf Archive</p><h1>My Rounds</h1><p>Every shared round is saved automatically, newest first.</p></div><RoundsHistory /></div></main>;
}
