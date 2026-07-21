import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { buildRoundHoles, getRoundTotals } from "@/lib/golf";
import { getRoundByShareId } from "@/lib/rounds";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { SaveRoundPayload } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await params;
  try {
    const user = isSupabaseConfigured() ? await getAuthenticatedUser(request) : null;
    const round = await getRoundByShareId(shareId, { userId: user?.id });
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
  const user = await getAuthenticatedUser(request);
  if (!editToken && !user) return NextResponse.json({ error: "Log in to edit this round." }, { status: 401 });

  const { shareId } = await params;
  const payload = (await request.json()) as Pick<SaveRoundPayload, "playedAt" | "holes" | "isPublic">;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.playedAt)) {
    return NextResponse.json({ error: "Choose a valid date." }, { status: 400 });
  }
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
  const { data: round } = await supabase
    .from("rounds")
    .select("id,user_id,edit_token_hash,is_public")
    .eq("share_id", shareId.toUpperCase())
    .maybeSingle();
  if (!round) return NextResponse.json({ error: "Round not found." }, { status: 404 });
  const tokenMatches = editToken
    ? createHash("sha256").update(editToken).digest("hex") === round.edit_token_hash
    : false;
  const ownsRound = Boolean(user && round.user_id === user.id);
  if (!tokenMatches && !ownsRound) {
    return NextResponse.json({ error: "You don’t have access to edit this round." }, { status: 403 });
  }

  const holes = buildRoundHoles(payload.holes);
  const totals = getRoundTotals(holes);
  const roundUpdates: Record<string, unknown> = {
    played_at: payload.playedAt,
    total_score: totals.totalScore,
    total_par: totals.totalPar,
    score_to_par: totals.scoreToPar,
    updated_at: new Date().toISOString(),
  };
  if (typeof payload.isPublic === "boolean") roundUpdates.is_public = payload.isPublic;
  const { error: updateError } = await supabase
    .from("rounds")
    .update(roundUpdates)
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

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ shareId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to delete this round." }, { status: 401 });
  const { shareId } = await params;
  const { data, error } = await getSupabaseServerClient()
    .from("rounds")
    .delete()
    .eq("share_id", shareId.toUpperCase())
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "We couldn’t delete this round." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Round not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
