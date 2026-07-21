import Link from "next/link";
import { ArrowRight, Check, Search, Share2, SlidersHorizontal } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { DEMO_ROUND } from "@/lib/demo-round";
import { BoxStrip } from "@/components/BoxStrip";
import { formatToPar } from "@/lib/golf";

export default function Home() {
  return (
    <main>
      <AppHeader />

      <section className="hero section-shell">
        <div className="hero-copy">
          <p className="eyebrow">The scorecard for the group chat</p>
          <h1>Share your round, hole by hole.</h1>
          <p className="hero-lede">
            Search your course, tap in your scores, and turn the day into a
            colorful recap your foursome will recognize instantly.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary button-large" href="/create">
              Create your round <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link className="text-link" href="/r/demo">
              See an example
            </Link>
          </div>
          <div className="hero-notes" aria-label="Product highlights">
            <span><Check size={15} /> No account to start</span>
            <span><Check size={15} /> Free to use</span>
            <span><Check size={15} /> Takes two minutes</span>
          </div>
        </div>

        <div className="hero-card-wrap" aria-label="Example share message">
          <div className="golf-ball-dots" aria-hidden="true" />
          <article className="share-card">
            <div className="share-card-topline">
              <span>Round complete</span>
              <span>18 holes</span>
            </div>
            <div className="share-card-course">
              <span aria-hidden="true">⛳</span>
              <div>
                <h2>{DEMO_ROUND.courseName}</h2>
                <p>Nashville, Tennessee</p>
              </div>
            </div>
            <div className="share-card-boxes">
              <BoxStrip holes={DEMO_ROUND.holes.slice(0, 9)} compact />
              <BoxStrip holes={DEMO_ROUND.holes.slice(9)} compact />
            </div>
            <div className="share-card-score">
              <span className="share-card-total">{DEMO_ROUND.totalScore}</span>
              <span className="share-card-to-par">{formatToPar(DEMO_ROUND.scoreToPar)}</span>
            </div>
            <div className="share-card-legend">
              <span><i className="legend-dot legend-eagle" /> Eagle+</span>
              <span><i className="legend-dot legend-birdie" /> Birdie</span>
              <span><i className="legend-dot legend-par" /> Par</span>
              <span><i className="legend-dot legend-bogey" /> Bogey</span>
              <span><i className="legend-dot legend-double" /> Double+</span>
            </div>
            <div className="share-card-footer">
              <span>rounds.golf/r/8K4MP7Q</span>
              <span className="share-mini-icon"><Share2 size={15} /></span>
            </div>
          </article>
        </div>
      </section>

      <section className="proof-strip">
        <div className="section-shell proof-strip-inner">
          <span>16,800+ US courses</span>
          <i />
          <span>Every score tells a story</span>
          <i />
          <span>Made for Messages</span>
        </div>
      </section>

      <section className="how-section section-shell" id="how-it-works">
        <div className="section-heading">
          <p className="eyebrow">From tee box to text thread</p>
          <h2>Your round, shared in three.</h2>
        </div>
        <div className="step-grid">
          <article className="step-card">
            <span className="step-number">01</span>
            <span className="step-icon"><Search size={23} /></span>
            <h3>Find your course</h3>
            <p>Search by course, city, or state. We’ll load the scorecard for you.</p>
          </article>
          <article className="step-card step-card-featured">
            <span className="step-number">02</span>
            <span className="step-icon"><SlidersHorizontal size={23} /></span>
            <h3>Tap in your scores</h3>
            <p>Move through each hole with big, simple controls built for the course.</p>
          </article>
          <article className="step-card">
            <span className="step-number">03</span>
            <span className="step-icon"><Share2 size={23} /></span>
            <h3>Save &amp; share</h3>
            <p>Create your free archive, then send the colorful recap to the group chat.</p>
          </article>
        </div>
      </section>

      <section className="closing-cta section-shell">
        <div>
          <p className="eyebrow eyebrow-light">Ready when you are</p>
          <h2>How’d you shoot?</h2>
          <p>The clubhouse is waiting. Turn today’s card into something worth sending.</p>
        </div>
        <Link className="button button-cream button-large" href="/create">
          Create your round <ArrowRight size={18} />
        </Link>
      </section>

      <footer className="site-footer section-shell">
        <div className="footer-brand">
          <span className="footer-ball" aria-hidden="true" />
          <div><strong>Rounds</strong><p>Great days deserve a proper recap.</p></div>
        </div>
        <div className="footer-meta">
          <a href="https://opengolfapi.org" target="_blank" rel="noreferrer">
            Course data from OpenGolfAPI, ODbL.
          </a>
          <span>© 2026 Rounds</span>
        </div>
      </footer>
    </main>
  );
}
