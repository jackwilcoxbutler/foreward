"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AlertCircle, ArrowLeft, Check, Eye, EyeOff, LoaderCircle, Minus, Plus } from "lucide-react";
import { useAuth } from "./AuthProvider";
import { buildRoundHoles, formatToPar, getRoundTotals } from "@/lib/golf";
import type { RoundRecord } from "@/lib/types";

export function RoundEditor({ shareId }: { shareId: string }) {
  const router = useRouter();
  const { loading: authLoading, session, user } = useAuth();
  const [round, setRound] = useState<RoundRecord | null>(null);
  const [scores, setScores] = useState<number[]>([]);
  const [playedAt, setPlayedAt] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!session) return;
    void fetch(`/api/rounds/${shareId}`, { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then(async (response) => {
        const payload = (await response.json()) as { round?: RoundRecord; error?: string };
        if (!response.ok || !payload.round) throw new Error(payload.error || "Round not found.");
        setRound(payload.round);
        setScores(payload.round.holes.map((hole) => hole.score));
        setPlayedAt(payload.round.playedAt);
        setIsPublic(payload.round.isPublic);
      })
      .catch((loadError: unknown) => setError(loadError instanceof Error ? loadError.message : "Round failed to load."))
      .finally(() => setLoading(false));
  }, [session, shareId]);

  const totals = useMemo(() => round ? getRoundTotals(round.holes.map((hole, index) => ({ par: hole.par, score: scores[index] ?? hole.score }))) : null, [round, scores]);

  function updateScore(index: number, next: number) {
    setScores((current) => current.map((score, scoreIndex) => scoreIndex === index ? Math.max(1, Math.min(20, next)) : score));
  }

  async function save() {
    if (!session || !round) return;
    setSaving(true);
    setError(null);
    const holes = buildRoundHoles(round.holes.map((hole, index) => ({ courseHoleNumber: hole.courseHoleNumber, par: hole.par, score: scores[index] })));
    const response = await fetch(`/api/rounds/${shareId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ playedAt, isPublic, holes }),
    });
    const payload = (await response.json()) as { error?: string };
    if (!response.ok) {
      setError(payload.error || "Round update failed.");
      setSaving(false);
      return;
    }
    router.push(isPublic ? `/r/${shareId}` : "/my-rounds");
    router.refresh();
  }

  if (authLoading || (Boolean(user) && loading)) return <section className="workspace-card empty-state">Loading your scorecard…</section>;
  if (!user) return <section className="workspace-card empty-state"><h2>Log in to edit this round.</h2><Link className="button button-primary" href={`/login?returnTo=/my-rounds/${shareId}/edit`}>Log in</Link></section>;
  if (!round || !totals) return <section className="workspace-card empty-state"><h2>Round unavailable.</h2><p>{error}</p><Link href="/my-rounds">Back to My Rounds</Link></section>;

  return (
    <section className="workspace-card round-editor">
      <Link className="back-link" href="/my-rounds"><ArrowLeft size={17} /> My Rounds</Link>
      <div className="round-editor-heading"><div><p className="eyebrow">Editing round</p><h2>{round.courseName}</h2></div><div className="editor-total"><span>Total</span><strong>{totals.totalScore}</strong><small>{formatToPar(totals.scoreToPar)}</small></div></div>
      <label className="editor-date">Date played<input type="date" value={playedAt} onChange={(event) => setPlayedAt(event.target.value)} /></label>
      <fieldset className="privacy-choice"><legend>Privacy</legend><button className={isPublic ? "selected" : ""} type="button" onClick={() => setIsPublic(true)}><Eye size={18} /><span><strong>Public</strong><small>Anyone with the link can view</small></span>{isPublic && <Check size={17} />}</button><button className={!isPublic ? "selected" : ""} type="button" onClick={() => setIsPublic(false)}><EyeOff size={18} /><span><strong>Private</strong><small>Only visible in My Rounds</small></span>{!isPublic && <Check size={17} />}</button></fieldset>
      <div className="editor-score-grid">
        {round.holes.map((hole, index) => <div key={hole.displayOrder}><span>Hole {hole.courseHoleNumber}</span><small>Par {hole.par}</small><div><button aria-label={`Decrease hole ${hole.courseHoleNumber}`} type="button" onClick={() => updateScore(index, scores[index] - 1)}><Minus size={15} /></button><input aria-label={`Score for hole ${hole.courseHoleNumber}`} type="number" min={1} max={20} value={scores[index]} onChange={(event) => updateScore(index, Number(event.target.value))} /><button aria-label={`Increase hole ${hole.courseHoleNumber}`} type="button" onClick={() => updateScore(index, scores[index] + 1)}><Plus size={15} /></button></div></div>)}
      </div>
      {error && <div className="inline-alert"><AlertCircle size={18} />{error}</div>}
      <button className="button button-primary button-large button-full" disabled={saving} type="button" onClick={save}>{saving ? <><LoaderCircle className="spin" size={19} /> Saving…</> : "Save changes"}</button>
    </section>
  );
}
