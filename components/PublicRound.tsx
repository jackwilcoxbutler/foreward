import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Sparkles } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { BoxStrip } from "./BoxStrip";
import { ShareActions } from "./ShareActions";
import { countResults, formatToPar, RESULT_META, ROUND_TYPE_LABELS } from "@/lib/golf";
import type { ResultCategory, RoundRecord } from "@/lib/types";

const resultOrder: ResultCategory[] = [
  "eagle_or_better",
  "birdie",
  "par",
  "bogey",
  "double_or_worse",
];

function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function PublicRound({ round }: { round: RoundRecord }) {
  const counts = countResults(round.holes);
  const front = round.holes.slice(0, 9);
  const back = round.holes.slice(9, 18);

  return (
    <main className="public-round-page">
      <header className="round-header">
        <div className="round-header-inner">
          <Link href="/" aria-label="Rounds home"><BrandMark light /></Link>
          <Link href="/create">Create your own <ArrowRight size={16} /></Link>
        </div>
      </header>

      <div className="round-page-shell">
        <section className="round-hero">
          <div className="round-hero-label"><span>Round complete</span><i /> <span>{ROUND_TYPE_LABELS[round.roundType]}</span></div>
          <h1>{round.courseName}</h1>
          <div className="round-meta">
            {(round.city || round.state) && <span><MapPin size={16} /> {[round.city, round.state].filter(Boolean).join(", ")}</span>}
            <span><CalendarDays size={16} /> {formatDate(round.playedAt)}</span>
          </div>

          <div className="public-score-lockup">
            <div><span>Total score</span><strong>{round.totalScore}</strong></div>
            <div className="public-to-par"><span>To par</span><strong>{formatToPar(round.scoreToPar)}</strong></div>
            <div><span>Total par</span><strong>{round.totalPar}</strong></div>
          </div>

          <article className="public-box-card">
            <div className="public-box-card-heading"><span>Your round at a glance</span><Sparkles size={17} /></div>
            <BoxStrip holes={front} />
            {!!back.length && <BoxStrip holes={back} />}
            <div className="public-box-legend">
              {resultOrder.map((result) => (
                <span key={result}><i className={`legend-dot legend-${result}`} />{RESULT_META[result].shortLabel}</span>
              ))}
            </div>
          </article>

          <ShareActions round={round} />
        </section>

        <section className="round-details-section">
          <div className="round-section-heading">
            <div><p className="eyebrow">Hole by hole</p><h2>The scorecard</h2></div>
            <span>{round.holes.length} holes</span>
          </div>

          <div className="public-scorecard">
            <div className="public-scorecard-row public-scorecard-head"><span>Hole</span><span>Par</span><span>Score</span><span>Result</span></div>
            {round.holes.map((hole) => (
              <div className="public-scorecard-row" key={hole.displayOrder}>
                <strong>{hole.courseHoleNumber}</strong>
                <span>{hole.par}</span>
                <strong>{hole.score}</strong>
                <span className={`score-result-pill score-result-${hole.resultCategory}`}><i />{RESULT_META[hole.resultCategory].shortLabel}</span>
              </div>
            ))}
          </div>

          <div className="result-counts">
            {resultOrder.map((result) => (
              <div key={result}>
                <span className={`count-box count-box-${result}`} />
                <strong>{counts[result]}</strong>
                <span>{RESULT_META[result].shortLabel}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="round-bottom-cta">
          <span className="cta-ball" aria-hidden="true" />
          <div><p className="eyebrow eyebrow-light">Your turn</p><h2>Played today?</h2><p>Build your own colorful recap in a couple of minutes.</p></div>
          <Link className="button button-cream button-large" href="/create">Create your round <ArrowRight size={18} /></Link>
        </section>

        <footer className="public-footer">
          <Link href="/"><BrandMark /></Link>
          <span>{round.courseSource === "opengolfapi" ? "Course data from OpenGolfAPI, ODbL." : "Course details entered by the golfer."}</span>
        </footer>
      </div>
    </main>
  );
}
