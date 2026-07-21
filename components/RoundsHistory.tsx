"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CalendarDays, Eye, EyeOff, LockKeyhole, Pencil, Trash2 } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { formatToPar } from "@/lib/golf";
import type { FeatureEntitlements } from "@/lib/features";
import type { RoundHistoryItem } from "@/lib/types";

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(`${date}T12:00:00Z`));
}

export function RoundsHistory() {
  const { loading: authLoading, session, user } = useAuth();
  const [rounds, setRounds] = useState<RoundHistoryItem[]>([]);
  const [entitlements, setEntitlements] = useState<FeatureEntitlements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadRounds = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError(null);
    const response = await fetch("/api/rounds", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = (await response.json()) as { rounds?: RoundHistoryItem[]; entitlements?: FeatureEntitlements; error?: string };
    if (!response.ok) setError(payload.error || "Round history failed to load.");
    else {
      setRounds(payload.rounds ?? []);
      setEntitlements(payload.entitlements ?? null);
    }
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => void loadRounds(), 0);
    return () => window.clearTimeout(timer);
  }, [loadRounds, session]);

  async function deleteRound(round: RoundHistoryItem) {
    if (!session || !window.confirm(`Delete your round at ${round.courseName}? This cannot be undone.`)) return;
    const response = await fetch(`/api/rounds/${round.shareId}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      setError(payload.error || "Round deletion failed.");
      return;
    }
    await loadRounds();
  }

  if (authLoading || (Boolean(user) && loading)) return <section className="workspace-card empty-state">Loading your rounds…</section>;
  if (!user) return <section className="workspace-card empty-state"><h2>Your Golf Archive starts here.</h2><p>Log in to see every saved round.</p><Link className="button button-primary" href="/login?returnTo=/my-rounds">Log in</Link></section>;
  if (error && !rounds.length) return <section className="workspace-card empty-state"><h2>We couldn’t load your rounds.</h2><p>{error}</p><button className="button button-primary" onClick={loadRounds} type="button">Try again</button></section>;
  if (!rounds.length) return <section className="workspace-card empty-state"><h2>No rounds yet.</h2><p>Your next shared round will appear here automatically.</p><Link className="button button-primary" href="/create">Create a round</Link></section>;

  const hasLocked = rounds.some((round) => round.locked);
  return (
    <div className="history-workspace">
      {error && <div className="inline-alert">{error}</div>}
      <section className="round-history-list" aria-label="Saved rounds">
        {rounds.map((round) => round.locked ? (
          <article className="history-row history-row-locked" key={round.shareId}>
            <div className="locked-round-copy" aria-hidden="true"><strong>Archived golf round</strong><span>Course and score</span></div>
            <span className="history-lock"><LockKeyhole size={17} /> Archive</span>
          </article>
        ) : (
          <article className="history-row" key={round.shareId}>
            <div className="history-course"><strong>{round.courseName}</strong><span><CalendarDays size={14} />{formatDate(round.playedAt)}</span></div>
            <div className="history-score"><strong>{round.totalScore}</strong><span>{formatToPar(round.scoreToPar)}</span></div>
            <span className={`privacy-pill ${round.isPublic ? "public" : "private"}`}>{round.isPublic ? <Eye size={14} /> : <EyeOff size={14} />}{round.isPublic ? "Public" : "Private"}</span>
            <div className="history-actions">
              {round.isPublic && <Link href={`/r/${round.shareId}`}>View</Link>}
              <Link href={`/my-rounds/${round.shareId}/edit`}><Pencil size={15} /> Edit</Link>
              <button aria-label={`Delete ${round.courseName}`} type="button" onClick={() => deleteRound(round)}><Trash2 size={16} /></button>
            </div>
          </article>
        ))}
      </section>
      {hasLocked && entitlements?.tier === "free" && (
        <section className="archive-upsell"><LockKeyhole size={24} /><div><p className="eyebrow">Your history is safe</p><h2>Unlock your Golf Archive</h2><p>See every course, score, and memory whenever you want.</p></div><strong>$19.99<span>/year</span></strong><button type="button" disabled>Coming soon</button></section>
      )}
    </div>
  );
}
