import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { savedCourseFromRow, validHolePars, type SavedCourseRow } from "@/lib/saved-courses";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to edit saved courses." }, { status: 401 });
  const { courseId } = await params;
  const body = (await request.json()) as {
    isFavorite?: boolean;
    name?: string;
    city?: string | null;
    state?: string | null;
    holes?: unknown;
  };

  const supabase = getSupabaseServerClient();
  const { data: existing } = await supabase
    .from("saved_courses")
    .select("id,is_custom")
    .eq("id", courseId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!existing) return NextResponse.json({ error: "Saved course not found." }, { status: 404 });

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (typeof body.isFavorite === "boolean") updates.is_favorite = body.isFavorite;
  if (body.name !== undefined || body.holes !== undefined) {
    if (!existing.is_custom) {
      return NextResponse.json({ error: "Only custom courses can change scorecard details." }, { status: 400 });
    }
    const holes = validHolePars(body.holes);
    if (!body.name?.trim() || !holes) {
      return NextResponse.json({ error: "Add a course name and valid hole pars." }, { status: 400 });
    }
    updates.name = body.name.trim();
    updates.city = body.city?.trim() || null;
    updates.state = body.state?.trim().toUpperCase() || null;
    updates.holes = holes;
  }

  const { data, error } = await supabase
    .from("saved_courses")
    .update(updates)
    .eq("id", courseId)
    .eq("user_id", user.id)
    .select("id,course_source,external_course_id,name,layout_name,city,state,tee_name,source_license,holes,is_favorite,is_custom,last_played_at,created_at")
    .single();
  if (error) return NextResponse.json({ error: "We couldn’t update this course." }, { status: 500 });
  return NextResponse.json({ course: savedCourseFromRow(data as SavedCourseRow) });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to delete saved courses." }, { status: 401 });
  const { courseId } = await params;
  const { data, error } = await getSupabaseServerClient()
    .from("saved_courses")
    .delete()
    .eq("id", courseId)
    .eq("user_id", user.id)
    .select("id")
    .maybeSingle();
  if (error) return NextResponse.json({ error: "We couldn’t delete this course." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Saved course not found." }, { status: 404 });
  return NextResponse.json({ ok: true });
}
