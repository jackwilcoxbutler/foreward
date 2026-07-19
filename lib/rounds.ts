import { DEMO_ROUND } from "./demo-round";
import { getSupabaseServerClient, isSupabaseConfigured } from "./supabase-server";
import type { RoundHole, RoundRecord } from "./types";

type RoundRow = {
  share_id: string;
  course_source: "opengolfapi" | "manual";
  external_course_id: string | null;
  course_name: string;
  course_layout_name: string | null;
  city: string | null;
  state: string | null;
  tee_name: string | null;
  round_type: RoundRecord["roundType"];
  played_at: string;
  total_score: number;
  total_par: number;
  score_to_par: number;
  created_at: string;
  source_license: string;
  round_holes: Array<{
    display_order: number;
    course_hole_number: number;
    par: number;
    score: number;
    result_category: RoundHole["resultCategory"];
  }>;
};

export async function getRoundByShareId(
  shareId: string,
): Promise<RoundRecord | null> {
  if (shareId.toLowerCase() === "demo") return DEMO_ROUND;
  if (!isSupabaseConfigured()) return null;

  const { data, error } = await getSupabaseServerClient()
    .from("rounds")
    .select(
      "share_id,course_source,external_course_id,course_name,course_layout_name,city,state,tee_name,round_type,played_at,total_score,total_par,score_to_par,created_at,source_license,round_holes(display_order,course_hole_number,par,score,result_category)",
    )
    .eq("share_id", shareId.toUpperCase())
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const row = data as unknown as RoundRow;
  return {
    shareId: row.share_id,
    courseSource: row.course_source,
    externalCourseId: row.external_course_id,
    courseName: row.course_name,
    courseLayoutName: row.course_layout_name,
    city: row.city,
    state: row.state,
    teeName: row.tee_name,
    roundType: row.round_type,
    playedAt: row.played_at,
    totalScore: row.total_score,
    totalPar: row.total_par,
    scoreToPar: row.score_to_par,
    createdAt: row.created_at,
    sourceLicense: row.source_license,
    holes: row.round_holes
      .sort((a, b) => a.display_order - b.display_order)
      .map((hole) => ({
        displayOrder: hole.display_order,
        courseHoleNumber: hole.course_hole_number,
        par: hole.par,
        score: hole.score,
        resultCategory: hole.result_category,
      })),
  };
}
