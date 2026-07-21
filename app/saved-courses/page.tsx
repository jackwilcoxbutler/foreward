import type { Metadata } from "next";
import { AppHeader } from "@/components/AppHeader";
import { SavedCoursesWorkspace } from "@/components/SavedCoursesWorkspace";

export const metadata: Metadata = { title: "Saved Courses" };

export default function SavedCoursesPage() {
  return <main className="dashboard-page"><AppHeader /><div className="dashboard-shell"><div className="dashboard-heading"><p className="eyebrow">Your course library</p><h1>Saved Courses</h1><p>Favorites stay at the top. Recent courses update after every round.</p></div><SavedCoursesWorkspace /></div></main>;
}
