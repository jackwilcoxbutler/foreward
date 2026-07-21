import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { RoundEditor } from "@/components/RoundEditor";

export const metadata: Metadata = { title: "Edit round" };

export default async function EditRoundPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  return <main className="dashboard-page"><AppHeader /><div className="dashboard-shell dashboard-shell-narrow"><RoundEditor shareId={shareId} /></div></main>;
}
