import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { buildRoundHoles, getRoundTotals } from "@/lib/golf";
import { getRoundByShareId } from "@/lib/rounds";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { SaveRoundPayload } from "@/lib/types";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  try {
    const round = await getRoundByShareId(shareId);
    if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });
    return NextResponse.json({ round });
  } catch {
    return NextResponse.json({ error: "We couldn’t load this round." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  const editToken = request.headers.get("x-round-edit-token");
  if (!editToken) return NextResponse.json({ error: "Edit token required." }, { status: 401 });

  const { shareId } = await params;
  const payload = (await request.json()) as Pick<SaveRoundPayload, "playedAt" | "holes">;
  if (![9, 18].includes(payload.holes?.length)) {
    return NextResponse.json({ error: "Complete either 9 or 18 holes." }, { status: 400 });
  }
  if (
    payload.holes.some(
      (hole) =>
        !Number.isInteger(hole.par) ||
        hole.par < 2 ||
        hole.par > 7 ||
        !Number.isInteger(hole.score) ||
        hole.score < 1 ||
        hole.score > 20,
    )
  ) {
    return NextResponse.json({ error: "Check the par and score values." }, { status: 400 });
  }

  const supabase = getSupabaseServerClient();
  const editTokenHash = createHash("sha256").update(editToken).digest("hex");
  const { data: round } = await supabase
    .from("rounds")
    .select("id")
    .eq("share_id", shareId.toUpperCase())
    .eq("edit_token_hash", editTokenHash)
    .maybeSingle();
  if (!round) return NextResponse.json({ error: "This edit link is no longer valid." }, { status: 403 });

  const holes = buildRoundHoles(payload.holes);
  const totals = getRoundTotals(holes);
  const { error: updateError } = await supabase
    .from("rounds")
    .update({
      played_at: payload.playedAt,
      total_score: totals.totalScore,
      total_par: totals.totalPar,
      score_to_par: totals.scoreToPar,
      updated_at: new Date().toISOString(),
    })
    .eq("id", round.id);

  if (updateError) return NextResponse.json({ error: "We couldn’t update this round." }, { status: 500 });
  await supabase.from("round_holes").delete().eq("round_id", round.id);
  const { error: holesError } = await supabase.from("round_holes").insert(
    holes.map((hole) => ({
      round_id: round.id,
      display_order: hole.displayOrder,
      course_hole_number: hole.courseHoleNumber,
      par: hole.par,
      score: hole.score,
      result_category: hole.resultCategory,
    })),
  );
  if (holesError) return NextResponse.json({ error: "We couldn’t update the scorecard." }, { status: 500 });
  return NextResponse.json({ ok: true });
}
