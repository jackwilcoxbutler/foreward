import type { Metadata } from "next";
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
      <RoundCreator />
      <footer className="creator-footer">
        Course data from <a href="https://opengolfapi.org" target="_blank" rel="noreferrer">OpenGolfAPI</a>, ODbL.
      </footer>
    </main>
  );
}
