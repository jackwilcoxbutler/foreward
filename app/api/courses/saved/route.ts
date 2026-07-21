import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/auth-server";
import { savedCourseFromRow, validHolePars, type SavedCourseRow } from "@/lib/saved-courses";
import { getSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase-server";
import type { CourseDetail } from "@/lib/types";

function unavailable() {
  return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
}

export async function GET(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to view saved courses." }, { status: 401 });

  const { data, error } = await getSupabaseServerClient()
    .from("saved_courses")
    .select("id,course_source,external_course_id,name,layout_name,city,state,tee_name,source_license,holes,is_favorite,is_custom,last_played_at,created_at")
    .eq("user_id", user.id)
    .order("is_favorite", { ascending: false })
    .order("last_played_at", { ascending: false, nullsFirst: false })
    .order("updated_at", { ascending: false });
  if (error) return NextResponse.json({ error: "We couldn’t load your courses." }, { status: 500 });

  const courses = (data as SavedCourseRow[])
    .map(savedCourseFromRow)
    .filter((course) => course !== null);
  return NextResponse.json({ courses });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return unavailable();
  const user = await getAuthenticatedUser(request);
  if (!user) return NextResponse.json({ error: "Log in to save courses." }, { status: 401 });

  const body = (await request.json()) as { course?: CourseDetail; isFavorite?: boolean };
  const course = body.course;
  const holes = validHolePars(course?.holes);
  if (!course?.name?.trim() || !holes) {
    return NextResponse.json({ error: "Add a course name and valid hole pars." }, { status: 400 });
  }

  const isCustom = !course.externalId || course.source === "custom" || course.source === "manual";
  const supabase = getSupabaseServerClient();
  if (course.externalId) {
    const { data: existing } = await supabase
      .from("saved_courses")
      .select("id")
      .eq("user_id", user.id)
      .eq("external_course_id", course.externalId)
      .maybeSingle();
    if (existing) {
      const { data, error } = await supabase
        .from("saved_courses")
        .update({
          name: course.name.trim(),
          layout_name: course.layoutName,
          city: course.city,
          state: course.state,
          tee_name: course.teeName,
          source_license: course.sourceLicense,
          holes,
          is_favorite: body.isFavorite ?? true,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id)
        .select("id,course_source,external_course_id,name,layout_name,city,state,tee_name,source_license,holes,is_favorite,is_custom,last_played_at,created_at")
        .single();
      if (error) return NextResponse.json({ error: "We couldn’t update this course." }, { status: 500 });
      return NextResponse.json({ course: savedCourseFromRow(data as SavedCourseRow) });
    }
  }

  const { data, error } = await supabase
    .from("saved_courses")
    .insert({
      user_id: user.id,
      course_source: isCustom ? "custom" : "opengolfapi",
      external_course_id: isCustom ? null : course.externalId,
      name: course.name.trim(),
      layout_name: course.layoutName,
      city: course.city,
      state: course.state,
      tee_name: course.teeName,
      source_license: course.sourceLicense,
      holes,
      is_favorite: body.isFavorite ?? true,
      is_custom: isCustom,
    })
    .select("id,course_source,external_course_id,name,layout_name,city,state,tee_name,source_license,holes,is_favorite,is_custom,last_played_at,created_at")
    .single();
  if (error) return NextResponse.json({ error: "We couldn’t save this course." }, { status: 500 });
  return NextResponse.json({ course: savedCourseFromRow(data as SavedCourseRow) }, { status: 201 });
}
