import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { buildRoundHoles, getRoundTotals } from "@/lib/golf";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { RoundType, SaveRoundPayload } from "@/lib/types";

const SHARE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const VALID_ROUND_TYPES: RoundType[] = [
  "front_9",
  "back_9",
  "nine_hole_course",
  "full_18",
];

function createShareId() {
  const bytes = randomBytes(7);
  return Array.from(bytes, (byte) => SHARE_ALPHABET[byte % SHARE_ALPHABET.length]).join("");
}

function validatePayload(payload: SaveRoundPayload) {
  if (!payload?.course?.name?.trim()) return "Add a course name.";
  if (!VALID_ROUND_TYPES.includes(payload.roundType)) return "Choose a valid round format.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(payload.playedAt)) return "Choose a valid date.";
  if (![9, 18].includes(payload.holes?.length)) return "Complete either 9 or 18 holes.";
  if (payload.holes.some((hole) => !Number.isInteger(hole.par) || hole.par < 2 || hole.par > 7)) {
    return "Every par must be between 2 and 7.";
  }
  if (payload.holes.some((hole) => !Number.isInteger(hole.score) || hole.score < 1 || hole.score > 20)) {
    return "Every score must be between 1 and 20.";
  }
  return null;
}

export async function POST(request: Request) {
  let payload: SaveRoundPayload;
  try {
    payload = (await request.json()) as SaveRoundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid round data." }, { status: 400 });
  }

  const validationError = validatePayload(payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      {
        error: "Round saving is ready, but Supabase still needs to be connected. Add the two server environment values, then try again.",
        code: "SUPABASE_NOT_CONFIGURED",
      },
      { status: 503 },
    );
  }

  const supabase = getSupabaseServerClient();
  const holes = buildRoundHoles(payload.holes);
  const totals = getRoundTotals(holes);
  const editToken = randomBytes(32).toString("base64url");
  const editTokenHash = createHash("sha256").update(editToken).digest("hex");

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const shareId = createShareId();
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        share_id: shareId,
        edit_token_hash: editTokenHash,
        course_source: payload.course.source,
        external_course_id: payload.course.externalId,
        course_name: payload.course.name.trim(),
        course_layout_name: payload.course.layoutName,
        city: payload.course.city,
        state: payload.course.state,
        tee_name: payload.course.teeName,
        round_type: payload.roundType,
        played_at: payload.playedAt,
        total_score: totals.totalScore,
        total_par: totals.totalPar,
        score_to_par: totals.scoreToPar,
        source_license: payload.course.sourceLicense,
      })
      .select("id")
      .single();

    if (roundError) {
      if (roundError.code === "23505") continue;
      return NextResponse.json({ error: "We couldn’t save this round. Please try again." }, { status: 500 });
    }

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

    if (holesError) {
      await supabase.from("rounds").delete().eq("id", round.id);
      return NextResponse.json({ error: "We couldn’t save the scorecard. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ shareId, editToken }, { status: 201 });
  }

  return NextResponse.json({ error: "We couldn’t create a share link. Please try again." }, { status: 500 });
}
