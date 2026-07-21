"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { AlertCircle, ChevronRight, Flag, LoaderCircle, MapPin, Pencil, Plus, Star, Trash2, X } from "lucide-react";
import { useAuth } from "./AuthProvider";
import type { SavedCourseRecord } from "@/lib/types";

function location(course: SavedCourseRecord) {
  return [course.city, course.state].filter(Boolean).join(", ") || "Location not listed";
}

export function SavedCoursesWorkspace() {
  const { loading: authLoading, session, user } = useAuth();
  const [courses, setCourses] = useState<SavedCourseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SavedCourseRecord | null>(null);
  const [name, setName] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [holeCount, setHoleCount] = useState<9 | 18>(18);
  const [pars, setPars] = useState<number[]>(Array(18).fill(4));
  const [saving, setSaving] = useState(false);

  const loadCourses = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    const response = await fetch("/api/courses/saved", { headers: { Authorization: `Bearer ${session.access_token}` } });
    const payload = (await response.json()) as { courses?: SavedCourseRecord[]; error?: string };
    if (!response.ok) setError(payload.error || "Saved courses failed to load.");
    else setCourses(payload.courses ?? []);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    if (!session) return;
    const timer = window.setTimeout(() => void loadCourses(), 0);
    return () => window.clearTimeout(timer);
  }, [loadCourses, session]);

  function openCreate() {
    setEditing(null); setName(""); setCity(""); setState(""); setHoleCount(18); setPars(Array(18).fill(4)); setShowForm(true); setError(null);
  }

  function openEdit(course: SavedCourseRecord) {
    setEditing(course); setName(course.name); setCity(course.city ?? ""); setState(course.state ?? ""); setHoleCount(course.holes.length as 9 | 18); setPars([...course.holes.map((hole) => hole.par), ...Array(18 - course.holes.length).fill(4)]); setShowForm(true); setError(null);
  }

  async function saveCustom(event: FormEvent) {
    event.preventDefault();
    if (!session || !name.trim()) return;
    setSaving(true); setError(null);
    const holes = pars.slice(0, holeCount).map((par, index) => ({ hole: index + 1, par }));
    const response = await fetch(editing ? `/api/courses/saved/${editing.savedCourseId}` : "/api/courses/saved", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(editing ? { name, city, state, holes } : { isFavorite: true, course: { externalId: null, source: "custom", name, layoutName: null, city: city || null, state: state.toUpperCase() || null, holes, teeName: null, sourceLicense: "User-entered" } }),
    });
    const payload = (await response.json()) as { course?: SavedCourseRecord; error?: string };
    if (!response.ok || !payload.course) setError(payload.error || "Custom course save failed.");
    else {
      setCourses((current) => editing ? current.map((course) => course.savedCourseId === editing.savedCourseId ? payload.course! : course) : [payload.course!, ...current]);
      setShowForm(false); setEditing(null);
    }
    setSaving(false);
  }

  async function toggleFavorite(course: SavedCourseRecord) {
    if (!session) return;
    const response = await fetch(`/api/courses/saved/${course.savedCourseId}`, { method: "PATCH", headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` }, body: JSON.stringify({ isFavorite: !course.isFavorite }) });
    const payload = (await response.json()) as { course?: SavedCourseRecord; error?: string };
    if (!response.ok || !payload.course) return setError(payload.error || "Favorite update failed.");
    setCourses((current) => current.map((item) => item.savedCourseId === course.savedCourseId ? payload.course! : item));
  }

  async function deleteCourse(course: SavedCourseRecord) {
    if (!session || !window.confirm(`Delete ${course.name} from Saved Courses? Past rounds will not be changed.`)) return;
    const response = await fetch(`/api/courses/saved/${course.savedCourseId}`, { method: "DELETE", headers: { Authorization: `Bearer ${session.access_token}` } });
    if (!response.ok) {
      const payload = (await response.json()) as { error?: string };
      return setError(payload.error || "Course deletion failed.");
    }
    setCourses((current) => current.filter((item) => item.savedCourseId !== course.savedCourseId));
  }

  if (authLoading || (Boolean(user) && loading)) return <section className="workspace-card empty-state">Loading your courses…</section>;
  if (!user) return <section className="workspace-card empty-state"><h2>Log in to save your favorite courses.</h2><Link className="button button-primary" href="/login?returnTo=/saved-courses">Log in</Link></section>;

  const favorites = courses.filter((course) => course.isFavorite);
  const customs = courses.filter((course) => course.isCustom);
  const recent = courses.filter((course) => course.lastPlayedAt && !course.isFavorite && !course.isCustom).slice(0, 6);
  const renderCourse = (course: SavedCourseRecord) => (
    <article className="saved-course-row" key={course.savedCourseId}>
      <span className="course-result-flag"><Flag size={18} /></span>
      <div><strong>{course.name}</strong><span><MapPin size={13} />{location(course)} · {course.holes.length} holes</span></div>
      <button className={course.isFavorite ? "favorite-button active" : "favorite-button"} aria-label={course.isFavorite ? `Remove ${course.name} from favorites` : `Favorite ${course.name}`} type="button" onClick={() => toggleFavorite(course)}><Star size={18} /></button>
      {course.isCustom && <button className="icon-button" aria-label={`Edit ${course.name}`} type="button" onClick={() => openEdit(course)}><Pencil size={16} /></button>}
      <button className="icon-button danger" aria-label={`Delete ${course.name}`} type="button" onClick={() => deleteCourse(course)}><Trash2 size={16} /></button>
      <Link className="play-course-link" href={`/create?savedCourse=${course.savedCourseId}`}>Play <ChevronRight size={15} /></Link>
    </article>
  );

  return (
    <div className="saved-courses-workspace">
      <button className="button button-primary create-custom-button" type="button" onClick={openCreate}><Plus size={18} /> Create Custom Course</button>
      {error && <div className="inline-alert"><AlertCircle size={18} />{error}</div>}
      {showForm && <section className="workspace-card custom-course-form"><button className="close-button" type="button" aria-label="Close custom course form" onClick={() => setShowForm(false)}><X size={18} /></button><p className="eyebrow">{editing ? "Edit custom course" : "New custom course"}</p><h2>{editing ? "Update the scorecard." : "Build your scorecard."}</h2><form onSubmit={saveCustom}><label>Course Name<input required value={name} onChange={(event) => setName(event.target.value)} /></label><div className="field-row"><label>City <span>Optional</span><input value={city} onChange={(event) => setCity(event.target.value)} /></label><label>State <span>Optional</span><input maxLength={2} value={state} onChange={(event) => setState(event.target.value)} /></label></div><fieldset className="manual-hole-choice"><legend>Course length</legend><button className={holeCount === 9 ? "selected" : ""} type="button" onClick={() => setHoleCount(9)}>9 holes</button><button className={holeCount === 18 ? "selected" : ""} type="button" onClick={() => setHoleCount(18)}>18 holes</button></fieldset><div className="manual-par-heading"><strong>Par for each hole</strong><span>2–7</span></div><div className="manual-par-grid">{pars.slice(0, holeCount).map((par, index) => <label key={index}><span>{index + 1}</span><input aria-label={`Par for hole ${index + 1}`} type="number" min={2} max={7} value={par} onChange={(event) => setPars((current) => current.map((value, parIndex) => parIndex === index ? Math.max(2, Math.min(7, Number(event.target.value))) : value))} /></label>)}</div><button className="button button-primary button-large button-full" disabled={saving} type="submit">{saving ? <><LoaderCircle className="spin" size={18} /> Saving…</> : "Save course"}</button></form></section>}
      {!courses.length && !showForm && <section className="workspace-card empty-state"><h2>No saved courses yet.</h2><p>Favorite a search result or create your own course.</p></section>}
      {!!favorites.length && <section className="course-library-section"><div><p className="eyebrow">Pinned first</p><h2>Favorites</h2></div><div>{favorites.map(renderCourse)}</div></section>}
      {!!recent.length && <section className="course-library-section"><div><p className="eyebrow">Played lately</p><h2>Recent</h2></div><div>{recent.map(renderCourse)}</div></section>}
      {!!customs.length && <section className="course-library-section"><div><p className="eyebrow">Built by you</p><h2>Custom Courses</h2></div><div>{customs.map(renderCourse)}</div></section>}
    </div>
  );
}
