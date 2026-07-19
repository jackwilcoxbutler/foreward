"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Flag,
  LoaderCircle,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Search,
  Sparkles,
} from "lucide-react";
import { BoxStrip } from "./BoxStrip";
import {
  buildRoundHoles,
  formatToPar,
  getResultCategory,
  getRoundTotals,
  RESULT_META,
  ROUND_TYPE_LABELS,
} from "@/lib/golf";
import type {
  CourseDetail,
  CourseSearchResult,
  HolePar,
  RoundRecord,
  RoundType,
} from "@/lib/types";

type CreatorStep = "course" | "manual" | "format" | "scores" | "review";

function todayLocal() {
  const date = new Date();
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 10);
}

function locationLabel(city: string | null, state: string | null) {
  return [city, state].filter(Boolean).join(", ") || "Location not listed";
}

function getRoundOptions(course: CourseDetail) {
  if (course.holes.length === 9) {
    return [
      {
        type: "nine_hole_course" as RoundType,
        label: "9 holes",
        detail: "The full course",
        holes: course.holes,
      },
    ];
  }
  return [
    {
      type: "full_18" as RoundType,
      label: "Full 18",
      detail: "Holes 1–18",
      holes: course.holes,
    },
    {
      type: "front_9" as RoundType,
      label: "Front 9",
      detail: "Holes 1–9",
      holes: course.holes.slice(0, 9),
    },
    {
      type: "back_9" as RoundType,
      label: "Back 9",
      detail: "Holes 10–18",
      holes: course.holes.slice(9, 18),
    },
  ];
}

export function RoundCreator() {
  const router = useRouter();
  const [step, setStep] = useState<CreatorStep>("course");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CourseSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingCourseId, setLoadingCourseId] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [roundType, setRoundType] = useState<RoundType | null>(null);
  const [roundHoles, setRoundHoles] = useState<HolePar[]>([]);
  const [scores, setScores] = useState<number[]>([]);
  const [activeHole, setActiveHole] = useState(0);
  const [playedAt, setPlayedAt] = useState(todayLocal());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualHoleCount, setManualHoleCount] = useState<9 | 18>(18);
  const [manualPars, setManualPars] = useState<number[]>(Array(18).fill(4));

  const progressStep = step === "course" || step === "manual" ? 1 : step === "format" ? 2 : step === "scores" ? 3 : 4;
  const completedHoles = scores.filter((score) => Number.isInteger(score) && score >= 1 && score <= 20).length;

  async function searchCourses(event: FormEvent) {
    event.preventDefault();
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSearchError("Type at least two letters to search.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    try {
      const response = await fetch(`/api/courses/search?q=${encodeURIComponent(trimmed)}`);
      const payload = (await response.json()) as { courses?: CourseSearchResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "Course search failed.");
      setSearchResults(payload.courses ?? []);
      if (!payload.courses?.length) setSearchError("No matches yet. Try a city or enter the course manually.");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Course search failed.");
    } finally {
      setSearching(false);
    }
  }

  async function selectCourse(result: CourseSearchResult) {
    setLoadingCourseId(result.id);
    setSearchError(null);
    try {
      const response = await fetch(`/api/courses/${encodeURIComponent(result.id)}`);
      const payload = (await response.json()) as { course?: CourseDetail; error?: string };
      if (!response.ok || !payload.course) throw new Error(payload.error || "Scorecard unavailable.");
      setCourse(payload.course);
      setStep("format");
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Scorecard unavailable.");
    } finally {
      setLoadingCourseId(null);
    }
  }

  function chooseFormat(type: RoundType, holes: HolePar[]) {
    setRoundType(type);
    setRoundHoles(holes);
    setScores(holes.map((hole) => hole.par));
    setActiveHole(0);
    setStep("scores");
  }

  function continueManualCourse(event: FormEvent) {
    event.preventDefault();
    if (!manualName.trim()) return;
    const pars = manualPars.slice(0, manualHoleCount);
    if (pars.some((par) => !Number.isInteger(par) || par < 2 || par > 7)) return;
    const manualCourse: CourseDetail = {
      externalId: null,
      source: "manual",
      name: manualName.trim(),
      layoutName: null,
      city: manualCity.trim() || null,
      state: manualState.trim().toUpperCase() || null,
      holes: pars.map((par, index) => ({ hole: index + 1, par })),
      teeName: null,
      sourceLicense: "User-entered",
    };
    setCourse(manualCourse);
    chooseFormat(manualHoleCount === 9 ? "nine_hole_course" : "full_18", manualCourse.holes);
  }

  function updateManualPar(index: number, value: number) {
    setManualPars((current) => current.map((par, i) => (i === index ? Math.max(2, Math.min(7, value)) : par)));
  }

  function updateScore(value: number) {
    const safe = Math.max(1, Math.min(20, value));
    setScores((current) => current.map((score, index) => (index === activeHole ? safe : score)));
  }

  function goBack() {
    if (step === "manual") return setStep("course");
    if (step === "format") return setStep("course");
    if (step === "scores") {
      if (activeHole > 0) return setActiveHole((index) => index - 1);
      return setStep("format");
    }
    if (step === "review") return setStep("scores");
  }

  const previewRound = useMemo<RoundRecord | null>(() => {
    if (!course || !roundType || !roundHoles.length || scores.length !== roundHoles.length) return null;
    const holes = buildRoundHoles(
      roundHoles.map((hole, index) => ({
        courseHoleNumber: hole.hole,
        par: hole.par,
        score: scores[index],
      })),
    );
    const totals = getRoundTotals(holes);
    return {
      shareId: "preview",
      courseSource: course.source,
      externalCourseId: course.externalId,
      courseName: course.name,
      courseLayoutName: course.layoutName,
      city: course.city,
      state: course.state,
      teeName: course.teeName,
      roundType,
      playedAt,
      totalScore: totals.totalScore,
      totalPar: totals.totalPar,
      scoreToPar: totals.scoreToPar,
      createdAt: new Date().toISOString(),
      sourceLicense: course.sourceLicense,
      holes,
    };
  }, [course, playedAt, roundHoles, roundType, scores]);

  async function saveRound() {
    if (!course || !roundType || !previewRound) return;
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          course,
          roundType,
          playedAt,
          holes: previewRound.holes.map((hole) => ({
            courseHoleNumber: hole.courseHoleNumber,
            par: hole.par,
            score: hole.score,
          })),
        }),
      });
      const payload = (await response.json()) as { shareId?: string; editToken?: string; error?: string };
      if (!response.ok || !payload.shareId) throw new Error(payload.error || "Round save failed.");
      if (payload.editToken) localStorage.setItem(`rounds:edit:${payload.shareId}`, payload.editToken);
      router.push(`/r/${payload.shareId}`);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Round save failed.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="creator-shell">
      <div className="creator-progress" aria-label={`Step ${progressStep} of 4`}>
        <div className="creator-progress-copy">
          <span>Step {progressStep} of 4</span>
          <span>{progressStep === 1 ? "Find course" : progressStep === 2 ? "Round format" : progressStep === 3 ? "Scorecard" : "Review"}</span>
        </div>
        <div className="creator-progress-track"><span style={{ width: `${progressStep * 25}%` }} /></div>
      </div>

      {step === "course" && (
        <section className="creator-panel course-search-panel">
          <div className="creator-heading">
            <p className="eyebrow">Let’s get your card</p>
            <h1>Where did you play?</h1>
            <p>Search by course name, city, or state.</p>
          </div>
          <form className="course-search-form" onSubmit={searchCourses}>
            <Search size={21} aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Try “Hermitage” or “Nashville”"
              aria-label="Search for a golf course"
              autoFocus
            />
            <button className="button button-primary" disabled={searching} type="submit">
              {searching ? <LoaderCircle className="spin" size={19} /> : "Search"}
            </button>
          </form>

          {searchError && (
            <div className="inline-alert" role="status"><AlertCircle size={18} /><span>{searchError}</span></div>
          )}

          {!!searchResults.length && (
            <div className="course-results" aria-label="Course search results">
              <div className="results-label"><span>{searchResults.length} matches</span><span>Course data by OpenGolfAPI</span></div>
              {searchResults.map((result) => (
                <button
                  className="course-result"
                  key={result.id}
                  onClick={() => selectCourse(result)}
                  disabled={Boolean(loadingCourseId)}
                  type="button"
                >
                  <span className="course-result-flag"><Flag size={19} /></span>
                  <span className="course-result-copy">
                    <strong>{result.name}</strong>
                    <span><MapPin size={14} /> {locationLabel(result.city, result.state)}</span>
                  </span>
                  <span className="course-result-meta">
                    <span>{result.holes ? `${result.holes} holes` : "Scorecard"}</span>
                    {result.par ? <small>Par {result.par}</small> : null}
                  </span>
                  {loadingCourseId === result.id ? <LoaderCircle className="spin" size={20} /> : <ChevronRight size={20} />}
                </button>
              ))}
            </div>
          )}

          <button className="manual-course-link" type="button" onClick={() => setStep("manual")}>
            <span className="manual-icon"><Pencil size={18} /></span>
            <span><strong>Can’t find your course?</strong><small>Enter the course and hole pars manually</small></span>
            <ChevronRight size={19} />
          </button>
        </section>
      )}

      {step === "manual" && (
        <section className="creator-panel manual-panel">
          <button className="back-link" type="button" onClick={goBack}><ArrowLeft size={17} /> Back to search</button>
          <div className="creator-heading">
            <p className="eyebrow">Manual scorecard</p>
            <h1>Add your course.</h1>
            <p>This course stays with this round and won’t be added to public search.</p>
          </div>
          <form onSubmit={continueManualCourse}>
            <div className="field-stack">
              <label>Course name<input required value={manualName} onChange={(event) => setManualName(event.target.value)} placeholder="Course name" /></label>
              <div className="field-row">
                <label>City <span>Optional</span><input value={manualCity} onChange={(event) => setManualCity(event.target.value)} placeholder="City" /></label>
                <label>State <span>Optional</span><input maxLength={2} value={manualState} onChange={(event) => setManualState(event.target.value)} placeholder="TN" /></label>
              </div>
            </div>
            <fieldset className="manual-hole-choice">
              <legend>Course length</legend>
              <button className={manualHoleCount === 9 ? "selected" : ""} type="button" onClick={() => setManualHoleCount(9)}>9 holes</button>
              <button className={manualHoleCount === 18 ? "selected" : ""} type="button" onClick={() => setManualHoleCount(18)}>18 holes</button>
            </fieldset>
            <div className="manual-par-heading"><strong>Hole pars</strong><span>2–7</span></div>
            <div className="manual-par-grid">
              {manualPars.slice(0, manualHoleCount).map((par, index) => (
                <label key={index}><span>{index + 1}</span><input aria-label={`Par for hole ${index + 1}`} inputMode="numeric" min={2} max={7} type="number" value={par} onChange={(event) => updateManualPar(index, Number(event.target.value))} /></label>
              ))}
            </div>
            <button className="button button-primary button-full button-large" type="submit" disabled={!manualName.trim()}>
              Continue to scores <ArrowRight size={18} />
            </button>
          </form>
        </section>
      )}

      {step === "format" && course && (
        <section className="creator-panel format-panel">
          <button className="back-link" type="button" onClick={goBack}><ArrowLeft size={17} /> Choose another course</button>
          <div className="selected-course-card">
            <span className="selected-course-icon"><Flag size={22} /></span>
            <div><span>Your course</span><strong>{course.name}</strong><small>{locationLabel(course.city, course.state)}</small></div>
            <span className="verified-pill"><Check size={13} /> Scorecard ready</span>
          </div>
          <div className="creator-heading format-heading">
            <p className="eyebrow">Choose your loop</p>
            <h1>What did you play?</h1>
          </div>
          <div className="format-options">
            {getRoundOptions(course).map((option) => (
              <button key={option.type} type="button" onClick={() => chooseFormat(option.type, option.holes)}>
                <span className="format-hole-count">{option.holes.length}</span>
                <span><strong>{option.label}</strong><small>{option.detail}</small></span>
                <ChevronRight size={20} />
              </button>
            ))}
          </div>
          <p className="data-note">Course data from OpenGolfAPI, ODbL. You’ll be able to review every par before saving.</p>
        </section>
      )}

      {step === "scores" && course && roundType && roundHoles[activeHole] && (
        <section className="creator-panel score-entry-panel">
          <div className="score-entry-topline">
            <button className="back-link" type="button" onClick={goBack}><ArrowLeft size={17} /> {activeHole > 0 ? "Previous hole" : "Round format"}</button>
            <span>{course.name}</span>
          </div>
          <div className="hole-progress-copy"><strong>Hole {activeHole + 1} of {roundHoles.length}</strong><span>{Math.round(((activeHole + 1) / roundHoles.length) * 100)}% complete</span></div>
          <div className="hole-progress-track"><span style={{ width: `${((activeHole + 1) / roundHoles.length) * 100}%` }} /></div>

          <div className="score-input-card">
            <span className="hole-kicker">Hole {roundHoles[activeHole].hole}</span>
            <div className="par-badge">Par {roundHoles[activeHole].par}</div>
            <div className="score-control">
              <button type="button" aria-label="Decrease score" disabled={scores[activeHole] <= 1} onClick={() => updateScore(scores[activeHole] - 1)}><Minus size={25} /></button>
              <label><span>Score</span><input aria-label={`Score for hole ${roundHoles[activeHole].hole}`} inputMode="numeric" min={1} max={20} type="number" value={scores[activeHole]} onChange={(event) => updateScore(Number(event.target.value))} /></label>
              <button type="button" aria-label="Increase score" disabled={scores[activeHole] >= 20} onClick={() => updateScore(scores[activeHole] + 1)}><Plus size={25} /></button>
            </div>
            <div className={`current-result result-${getResultCategory(scores[activeHole], roundHoles[activeHole].par)}`}>
              <i /> {RESULT_META[getResultCategory(scores[activeHole], roundHoles[activeHole].par)].label}
            </div>
          </div>

          <div className="score-running-total">
            <div><span>Through {activeHole + 1}</span><strong>{scores.slice(0, activeHole + 1).reduce((sum, score) => sum + score, 0)}</strong></div>
            <div><span>To par</span><strong>{formatToPar(scores.slice(0, activeHole + 1).reduce((sum, score, index) => sum + score - roundHoles[index].par, 0))}</strong></div>
          </div>

          <button
            className="button button-primary button-large button-full"
            type="button"
            onClick={() => {
              if (activeHole < roundHoles.length - 1) setActiveHole((index) => index + 1);
              else setStep("review");
            }}
          >
            {activeHole < roundHoles.length - 1 ? <>Next hole <ArrowRight size={19} /></> : <>Review scorecard <ArrowRight size={19} /></>}
          </button>
          <div className="hole-jump-row" aria-label="Jump to a hole">
            {roundHoles.map((hole, index) => (
              <button className={index === activeHole ? "active" : index < activeHole ? "complete" : ""} type="button" key={hole.hole} aria-label={`Go to hole ${hole.hole}`} onClick={() => setActiveHole(index)}>{index < activeHole ? <Check size={12} /> : hole.hole}</button>
            ))}
          </div>
        </section>
      )}

      {step === "review" && course && roundType && previewRound && (
        <section className="creator-panel review-panel">
          <button className="back-link" type="button" onClick={goBack}><ArrowLeft size={17} /> Back to scores</button>
          <div className="creator-heading review-heading">
            <p className="eyebrow">One last look</p>
            <h1>Review your round.</h1>
            <p>Tap any score to make a quick correction.</p>
          </div>

          <article className="review-summary-card">
            <div className="review-course-line">
              <div><span>{ROUND_TYPE_LABELS[roundType]}</span><h2>{course.name}</h2><p>{locationLabel(course.city, course.state)}</p></div>
              <label className="date-field"><CalendarDays size={17} /><input aria-label="Date played" type="date" value={playedAt} onChange={(event) => setPlayedAt(event.target.value)} /></label>
            </div>
            <div className="review-score-line">
              <div><span>Total score</span><strong>{previewRound.totalScore}</strong></div>
              <div><span>To par</span><strong>{formatToPar(previewRound.scoreToPar)}</strong></div>
              <div><span>Total par</span><strong>{previewRound.totalPar}</strong></div>
            </div>
            <div className="review-boxes">
              {Array.from({ length: Math.ceil(previewRound.holes.length / 9) }, (_, row) => (
                <BoxStrip compact key={row} holes={previewRound.holes.slice(row * 9, row * 9 + 9)} />
              ))}
            </div>
          </article>

          <div className="scorecard-table-wrap">
            <table className="scorecard-table">
              <thead><tr><th>Hole</th>{previewRound.holes.map((hole) => <th key={hole.displayOrder}>{hole.courseHoleNumber}</th>)}<th>Total</th></tr></thead>
              <tbody>
                <tr><th>Par</th>{previewRound.holes.map((hole) => <td key={hole.displayOrder}>{hole.par}</td>)}<td>{previewRound.totalPar}</td></tr>
                <tr className="score-row"><th>Score</th>{previewRound.holes.map((hole, index) => <td key={hole.displayOrder}><button aria-label={`Edit score for hole ${hole.courseHoleNumber}`} type="button" onClick={() => { setActiveHole(index); setStep("scores"); }}>{hole.score}</button></td>)}<td>{previewRound.totalScore}</td></tr>
              </tbody>
            </table>
          </div>

          <div className="share-preview-note"><Sparkles size={19} /><span><strong>Your share card is ready.</strong> Saving creates a permanent, view-only link.</span></div>
          {saveError && <div className="inline-alert save-alert" role="alert"><AlertCircle size={19} /><span>{saveError}</span></div>}
          <button className="button button-primary button-large button-full" type="button" disabled={saving || completedHoles !== roundHoles.length} onClick={saveRound}>
            {saving ? <><LoaderCircle className="spin" size={20} /> Saving your round…</> : <>Save &amp; see share card <ArrowRight size={19} /></>}
          </button>
          <p className="privacy-note">No account needed. Your public page is view-only.</p>
        </section>
      )}
    </div>
  );
}
