import type { Metadata } from "next";
import { Suspense } from "react";
import { AppHeader } from "@/components/AppHeader";
import { RoundCreator } from "@/components/RoundCreator";

export const metadata: Metadata = {
  title: "Create your round",
  description: "Find your course and turn your scorecard into a shareable golf recap.",
};

export default function CreateRoundPage() {
  return (
    <main className="creator-page">
      <AppHeader compact />
      <Suspense fallback={<div className="creator-shell"><section className="creator-panel empty-state">Loading your scorecard…</section></div>}><RoundCreator /></Suspense>
      <footer className="creator-footer">
        Course data from <a href="https://opengolfapi.org" target="_blank" rel="noreferrer">OpenGolfAPI</a>, ODbL.
      </footer>
    </main>
  );
}
