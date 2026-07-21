"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  ChevronRight,
  Flag,
  Eye,
  EyeOff,
  LoaderCircle,
  MapPin,
  Minus,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Star,
} from "lucide-react";
import { BoxStrip } from "./BoxStrip";
import { useAuth } from "./AuthProvider";
import {
  buildRoundHoles,
  formatToPar,
  getResultCategory,
  getRoundTotals,
  RESULT_META,
  ROUND_TYPE_LABELS,
} from "@/lib/golf";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import type {
  CourseDetail,
  CourseSearchResult,
  HolePar,
  RoundRecord,
  SavedCourseRecord,
  RoundType,
} from "@/lib/types";

type CreatorStep = "course" | "manual" | "format" | "scores" | "review" | "account";
type AccountMode = "signup" | "login";

const DRAFT_KEY = "rounds:creator-draft:v1";

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
  const searchParams = useSearchParams();
  const { session, configured: authConfigured } = useAuth();
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
  const [isPublic, setIsPublic] = useState(true);
  const [draftReady, setDraftReady] = useState(false);
  const [savedCourses, setSavedCourses] = useState<SavedCourseRecord[]>([]);
  const [savedCoursesLoading, setSavedCoursesLoading] = useState(false);
  const [favoriteSaving, setFavoriteSaving] = useState(false);
  const [accountMode, setAccountMode] = useState<AccountMode>("signup");
  const [accountEmail, setAccountEmail] = useState("");
  const [accountPassword, setAccountPassword] = useState("");
  const [accountSubmitting, setAccountSubmitting] = useState(false);

  const [manualName, setManualName] = useState("");
  const [manualCity, setManualCity] = useState("");
  const [manualState, setManualState] = useState("");
  const [manualHoleCount, setManualHoleCount] = useState<9 | 18>(18);
  const [manualPars, setManualPars] = useState<number[]>(Array(18).fill(4));

  const progressStep = step === "course" || step === "manual" ? 1 : step === "format" ? 2 : step === "scores" ? 3 : 4;
  const completedHoles = scores.filter((score) => Number.isInteger(score) && score >= 1 && score <= 20).length;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = localStorage.getItem(DRAFT_KEY);
        if (!raw) return;
        const draft = JSON.parse(raw) as {
        step?: CreatorStep;
        query?: string;
        course?: CourseDetail | null;
        roundType?: RoundType | null;
        roundHoles?: HolePar[];
        scores?: number[];
        activeHole?: number;
        playedAt?: string;
        isPublic?: boolean;
        manualName?: string;
        manualCity?: string;
        manualState?: string;
        manualHoleCount?: 9 | 18;
        manualPars?: number[];
        };
        const validSteps: CreatorStep[] = ["course", "manual", "format", "scores", "review"];
        if (draft.step && validSteps.includes(draft.step)) setStep(draft.step);
        if (typeof draft.query === "string") setQuery(draft.query);
        if (draft.course) setCourse(draft.course);
        if (draft.roundType) setRoundType(draft.roundType);
        if (Array.isArray(draft.roundHoles)) setRoundHoles(draft.roundHoles);
        if (Array.isArray(draft.scores)) setScores(draft.scores);
        if (Number.isInteger(draft.activeHole)) setActiveHole(draft.activeHole ?? 0);
        if (typeof draft.playedAt === "string") setPlayedAt(draft.playedAt);
        if (typeof draft.isPublic === "boolean") setIsPublic(draft.isPublic);
        if (typeof draft.manualName === "string") setManualName(draft.manualName);
        if (typeof draft.manualCity === "string") setManualCity(draft.manualCity);
        if (typeof draft.manualState === "string") setManualState(draft.manualState);
        if (draft.manualHoleCount === 9 || draft.manualHoleCount === 18) setManualHoleCount(draft.manualHoleCount);
        if (Array.isArray(draft.manualPars)) setManualPars(draft.manualPars);
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      } finally {
        setDraftReady(true);
      }
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!draftReady) return;
    localStorage.setItem(DRAFT_KEY, JSON.stringify({
      step: step === "account" ? "review" : step,
      query,
      course,
      roundType,
      roundHoles,
      scores,
      activeHole,
      playedAt,
      isPublic,
      manualName,
      manualCity,
      manualState,
      manualHoleCount,
      manualPars,
    }));
  }, [activeHole, course, draftReady, isPublic, manualCity, manualHoleCount, manualName, manualPars, manualState, playedAt, query, roundHoles, roundType, scores, step]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => {
      setSavedCoursesLoading(true);
      void fetch("/api/courses/saved", { headers: { Authorization: `Bearer ${session.access_token}` } })
        .then(async (response) => {
          const payload = (await response.json()) as { courses?: SavedCourseRecord[] };
          if (response.ok) setSavedCourses(payload.courses ?? []);
        })
        .finally(() => setSavedCoursesLoading(false));
    }, 0);
    return () => window.clearTimeout(timer);
  }, [session]);

  useEffect(() => {
    const requestedCourse = searchParams.get("savedCourse");
    if (!requestedCourse || step !== "course") return;
    const match = savedCourses.find((savedCourse) => savedCourse.savedCourseId === requestedCourse);
    if (!match) return;
    const timer = window.setTimeout(() => {
      setCourse(match);
      setStep("format");
    }, 0);
    return () => window.clearTimeout(timer);
  }, [savedCourses, searchParams, step]);

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

  function selectSavedCourse(savedCourse: SavedCourseRecord) {
    setCourse(savedCourse);
    setStep("format");
  }

  async function favoriteCurrentCourse() {
    if (!course) return;
    if (!session) {
      router.push("/login?returnTo=/create");
      return;
    }
    if (course.isFavorite) return;
    setFavoriteSaving(true);
    setSaveError(null);
    const existing = course.savedCourseId;
    const response = await fetch(existing ? `/api/courses/saved/${existing}` : "/api/courses/saved", {
      method: existing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(existing ? { isFavorite: true } : { course, isFavorite: true }),
    });
    const payload = (await response.json()) as { course?: SavedCourseRecord; error?: string };
    if (!response.ok || !payload.course) setSaveError(payload.error || "Course favorite failed.");
    else {
      setCourse(payload.course);
      setSavedCourses((current) => [payload.course!, ...current.filter((item) => item.savedCourseId !== payload.course!.savedCourseId)]);
    }
    setFavoriteSaving(false);
  }

  function chooseFormat(type: RoundType, holes: HolePar[]) {
    setRoundType(type);
    setRoundHoles(holes);
    setScores(holes.map((hole) => hole.par));
    setActiveHole(0);
    setStep("scores");
  }

  function reviewCoursePars() {
    if (!course) return;
    setManualName(course.name);
    setManualCity(course.city ?? "");
    setManualState(course.state ?? "");
    setManualHoleCount(course.holes.length === 9 ? 9 : 18);
    setManualPars([
      ...course.holes.map((hole) => hole.par),
      ...Array(Math.max(0, 18 - course.holes.length)).fill(4),
    ]);
    setStep("manual");
  }

  function continueManualCourse(event: FormEvent) {
    event.preventDefault();
    if (!manualName.trim()) return;
    const pars = manualPars.slice(0, manualHoleCount);
    if (pars.some((par) => !Number.isInteger(par) || par < 2 || par > 7)) return;
    const manualCourse: CourseDetail = {
      externalId: null,
      source: "custom",
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
    if (step === "account") return setStep("review");
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
      isPublic,
      holes,
    };
  }, [course, isPublic, playedAt, roundHoles, roundType, scores]);

  async function saveRound(accessToken = session?.access_token) {
    if (!course || !roundType || !previewRound || !accessToken) {
      setStep("account");
      return false;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const response = await fetch("/api/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({
          course,
          roundType,
          playedAt,
          isPublic,
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
      localStorage.removeItem(DRAFT_KEY);
      router.push(isPublic ? `/r/${payload.shareId}` : "/my-rounds");
      return true;
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : "Round save failed.");
      return false;
    } finally {
      setSaving(false);
    }
  }

  async function submitAccount(event: FormEvent) {
    event.preventDefault();
    if (!authConfigured) return setSaveError("Supabase Auth still needs to be connected.");
    if (accountPassword.length < 8) return setSaveError("Use at least 8 characters for your password.");
    setAccountSubmitting(true);
    setSaveError(null);
    const supabase = getSupabaseBrowserClient();
    const result = accountMode === "signup"
      ? await supabase.auth.signUp({ email: accountEmail, password: accountPassword })
      : await supabase.auth.signInWithPassword({ email: accountEmail, password: accountPassword });
    if (result.error) {
      setSaveError(result.error.message);
      setAccountSubmitting(false);
      return;
    }
    if (!result.data.session) {
      setSaveError("Automatic sign-in is unavailable. Disable Confirm email in Supabase Auth so golfers can share immediately.");
      setAccountSubmitting(false);
      return;
    }
    await saveRound(result.data.session.access_token);
    setAccountSubmitting(false);
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
          {session && (savedCoursesLoading || savedCourses.some((savedCourse) => savedCourse.isFavorite || savedCourse.lastPlayedAt)) && (
            <div className="picker-saved-sections">
              {savedCourses.some((savedCourse) => savedCourse.isFavorite) && <section><div className="picker-section-label"><Star size={14} /> Favorites</div><div className="picker-course-chips">{savedCourses.filter((savedCourse) => savedCourse.isFavorite).map((savedCourse) => <button type="button" key={savedCourse.savedCourseId} onClick={() => selectSavedCourse(savedCourse)}><strong>{savedCourse.name}</strong><small>{savedCourse.holes.length} holes · {locationLabel(savedCourse.city, savedCourse.state)}</small><ChevronRight size={17} /></button>)}</div></section>}
              {savedCourses.some((savedCourse) => savedCourse.lastPlayedAt && !savedCourse.isFavorite) && <section><div className="picker-section-label"><CalendarDays size={14} /> Recent</div><div className="picker-course-chips">{savedCourses.filter((savedCourse) => savedCourse.lastPlayedAt && !savedCourse.isFavorite).slice(0, 4).map((savedCourse) => <button type="button" key={savedCourse.savedCourseId} onClick={() => selectSavedCourse(savedCourse)}><strong>{savedCourse.name}</strong><small>{savedCourse.holes.length} holes · {locationLabel(savedCourse.city, savedCourse.state)}</small><ChevronRight size={17} /></button>)}</div></section>}
              {savedCoursesLoading && <span className="saved-courses-loading"><LoaderCircle className="spin" size={16} /> Loading saved courses…</span>}
            </div>
          )}
          <div className="picker-section-label search-section-label"><Search size={14} /> Search</div>
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
            <span><strong>Create Custom Course</strong><small>Enter a course name and par for every hole</small></span>
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
            <p>It won’t be added to public search. After saving, it stays in your course library.</p>
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
          <button className={`favorite-course-action${course.isFavorite ? " active" : ""}`} disabled={favoriteSaving || course.isFavorite} type="button" onClick={favoriteCurrentCourse}><Star size={17} />{course.isFavorite ? "Saved to Favorites" : session ? "Save to Favorites" : "Log in to favorite this course"}</button>
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
          <div className="course-par-check">
            <div>
              <span>Hole pars</span>
              <div>
                {course.holes.map((hole) => (
                  <i key={hole.hole} title={`Hole ${hole.hole}: par ${hole.par}`}>
                    <small>{hole.hole}</small><strong>{hole.par}</strong>
                  </i>
                ))}
              </div>
            </div>
            <button type="button" onClick={reviewCoursePars}>Pars look wrong? Review &amp; edit</button>
          </div>
          <p className="data-note">{course.source === "opengolfapi" ? "Course data from OpenGolfAPI, ODbL." : "Custom course details entered by you."} You’ll be able to review every par before saving.</p>
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

          <div className="share-preview-note"><Sparkles size={19} /><span><strong>{isPublic ? "Your share card is ready." : "Your private round is ready."}</strong> {isPublic ? "Saving creates a permanent, view-only link." : "It will only appear in My Rounds."}</span></div>
          <fieldset className="privacy-choice review-privacy"><legend>Who can view this round?</legend><button className={isPublic ? "selected" : ""} type="button" onClick={() => setIsPublic(true)}><Eye size={18} /><span><strong>Public</strong><small>Anyone with the link can view</small></span>{isPublic && <Check size={17} />}</button><button className={!isPublic ? "selected" : ""} type="button" onClick={() => setIsPublic(false)}><EyeOff size={18} /><span><strong>Private</strong><small>Only visible in My Rounds</small></span>{!isPublic && <Check size={17} />}</button></fieldset>
          {saveError && <div className="inline-alert save-alert" role="alert"><AlertCircle size={19} /><span>{saveError}</span></div>}
          <button className="button button-primary button-large button-full" type="button" disabled={saving || completedHoles !== roundHoles.length} onClick={() => { if (session) void saveRound(); else setStep("account"); }}>
            {saving ? <><LoaderCircle className="spin" size={20} /> Saving your round…</> : <>{isPublic ? "Save & Share" : "Save private round"} <ArrowRight size={19} /></>}
          </button>
          <p className="privacy-note">Your scores are saved automatically after this final step.</p>
        </section>
      )}

      {step === "account" && course && previewRound && (
        <section className="creator-panel account-wall-panel">
          <button className="back-link" type="button" onClick={goBack}><ArrowLeft size={17} /> Back to review</button>
          <div className="account-wall-ready"><span aria-hidden="true">⛳</span><div><p className="eyebrow">Final step</p><h1>Your round is ready!</h1><p>{course.name} · {previewRound.totalScore} ({formatToPar(previewRound.scoreToPar)})</p></div></div>
          <div className="account-wall-value"><p>Create your free account to:</p><ul><li><Check size={17} /> Save this round forever</li><li><Check size={17} /> Edit it later</li><li><Check size={17} /> Build your Golf Archive</li><li><Check size={17} /> Share with friends</li></ul></div>
          <form className="account-wall-form" onSubmit={submitAccount}>
            <label>Email<input type="email" autoComplete="email" required value={accountEmail} onChange={(event) => setAccountEmail(event.target.value)} /></label>
            <label>Password<input type="password" autoComplete={accountMode === "signup" ? "new-password" : "current-password"} minLength={8} required value={accountPassword} onChange={(event) => setAccountPassword(event.target.value)} /><small>{accountMode === "signup" ? "At least 8 characters" : "Your existing password"}</small></label>
            {saveError && <div className="inline-alert save-alert" role="alert"><AlertCircle size={19} /><span>{saveError}</span></div>}
            <button className="button button-primary button-large button-full" disabled={accountSubmitting || saving} type="submit">{accountSubmitting || saving ? <><LoaderCircle className="spin" size={20} /> Saving your round…</> : <>{accountMode === "signup" ? "Create Free Account" : "Log In & Save Round"} <ArrowRight size={18} /></>}</button>
          </form>
          <button className="account-mode-toggle" type="button" onClick={() => { setAccountMode((mode) => mode === "signup" ? "login" : "signup"); setSaveError(null); }}>{accountMode === "signup" ? "Already have an account? Log in" : "New here? Create a free account"}</button>
          <p className="privacy-note">No profile questions. Sharing stays free forever.</p>
        </section>
      )}
    </div>
  );
}
