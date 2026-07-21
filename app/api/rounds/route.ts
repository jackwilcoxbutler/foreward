import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { getFeatureEntitlements, isHistoryItemLocked, type SubscriptionTier } from "@/lib/features";
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
  if (typeof payload.isPublic !== "boolean") return "Choose whether this round is public or private.";
  if (![9, 18].includes(payload.holes?.length)) return "Complete either 9 or 18 holes.";
  if (payload.holes.some((hole) => !Number.isInteger(hole.par) || hole.par < 2 || hole.par > 7)) {
    return "Every par must be between 2 and 7.";
  }
  if (payload.holes.some((hole) => !Number.isInteger(hole.score) || hole.score < 1 || hole.score > 20)) {
    return "Every score must be between 1 and 20.";
  }
  return null;
}

async function rememberPlayedCourse(
  userId: string,
  payload: SaveRoundPayload,
) {
  const supabase = getSupabaseServerClient();
  const playedAtTimestamp = `${payload.playedAt}T12:00:00.000Z`;
  const requestedId = payload.course.savedCourseId;
  if (requestedId) {
    const { data } = await supabase
      .from("saved_courses")
      .update({ last_played_at: playedAtTimestamp, updated_at: new Date().toISOString() })
      .eq("id", requestedId)
      .eq("user_id", userId)
      .select("id")
      .maybeSingle();
    if (data) return data.id as string;
  }

  if (payload.course.externalId) {
    const { data: existing } = await supabase
      .from("saved_courses")
      .select("id")
      .eq("user_id", userId)
      .eq("external_course_id", payload.course.externalId)
      .maybeSingle();
    if (existing) {
      await supabase
        .from("saved_courses")
        .update({ last_played_at: playedAtTimestamp, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      return existing.id as string;
    }
  }

  const isCustom = !payload.course.externalId;
  const { data } = await supabase
    .from("saved_courses")
    .insert({
      user_id: userId,
      course_source: isCustom ? "custom" : "opengolfapi",
      external_course_id: payload.course.externalId,
      name: payload.course.name.trim(),
      layout_name: payload.course.layoutName,
      city: payload.course.city,
      state: payload.course.state,
      tee_name: payload.course.teeName,
      source_license: payload.course.sourceLicense,
      holes: payload.course.holes,
      is_favorite: false,
      is_custom: isCustom,
      last_played_at: playedAtTimestamp,
    })
    .select("id")
    .single();
  return (data?.id as string | undefined) ?? null;
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to view your rounds." }, { status: 401 });

  const supabase = getSupabaseServerClient();
  const [{ data: profile }, { data, error }] = await Promise.all([
    supabase.from("profiles").select("subscription_tier").eq("id", user.id).maybeSingle(),
    supabase
      .from("rounds")
      .select("share_id,course_name,played_at,total_score,total_par,score_to_par,is_public")
      .eq("user_id", user.id)
      .order("played_at", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ error: "We couldn’t load your rounds." }, { status: 500 });

  const tier: SubscriptionTier = profile?.subscription_tier === "premium" ? "premium" : "free";
  const entitlements = getFeatureEntitlements(tier);
  const rounds = (data ?? []).map((round, index) => ({
    shareId: round.share_id,
    courseName: round.course_name,
    playedAt: round.played_at,
    totalScore: round.total_score,
    totalPar: round.total_par,
    scoreToPar: round.score_to_par,
    isPublic: round.is_public,
    locked: isHistoryItemLocked(index, entitlements),
  }));
  return NextResponse.json({ rounds, entitlements });
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

  const user = await getAuthenticatedUser(request);
  if (!user) {
    return NextResponse.json({ error: "Create an account or log in to save this round." }, { status: 401 });
  }

  const supabase = getSupabaseServerClient();
  const holes = buildRoundHoles(payload.holes);
  const totals = getRoundTotals(holes);
  const editToken = randomBytes(32).toString("base64url");
  const editTokenHash = createHash("sha256").update(editToken).digest("hex");
  const savedCourseId = await rememberPlayedCourse(user.id, payload);

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const shareId = createShareId();
    const { data: round, error: roundError } = await supabase
      .from("rounds")
      .insert({
        share_id: shareId,
        user_id: user.id,
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
        is_public: payload.isPublic,
        saved_course_id: savedCourseId,
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
