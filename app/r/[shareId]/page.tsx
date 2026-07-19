import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PublicRound } from "@/components/PublicRound";
import { getRoundByShareId } from "@/lib/rounds";

export async function generateMetadata({ params }: { params: Promise<{ shareId: string }> }): Promise<Metadata> {
  const { shareId } = await params;
  const round = await getRoundByShareId(shareId);
  if (!round) return { title: "Round not found" };
  return {
    title: `${round.courseName} — ${round.totalScore} (${round.scoreToPar > 0 ? "+" : ""}${round.scoreToPar})`,
    description: `View this ${round.holes.length}-hole round at ${round.courseName}.`,
  };
}

export default async function PublicRoundPage({ params }: { params: Promise<{ shareId: string }> }) {
  const { shareId } = await params;
  const round = await getRoundByShareId(shareId);
  if (!round) notFound();
  return <PublicRound round={round} />;
}
