import { NextResponse } from "next/server";
import type { CourseDetail } from "@/lib/types";
import {
  normalizeOpenGolfHoles,
  OPENGOLF_API_ORIGIN,
  type RawOpenGolfCourse,
} from "@/lib/opengolf";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  try {
    let response = await fetch(
      `${OPENGOLF_API_ORIGIN}/api/v1/courses/${encodeURIComponent(courseId)}`,
      { headers: { Accept: "application/json" } },
    );
    // Keep the keyless basic endpoint as a resilience fallback.
    if (!response.ok && response.status !== 404) {
      response = await fetch(
        `${OPENGOLF_API_ORIGIN}/v1/courses/${encodeURIComponent(courseId)}`,
        { headers: { Accept: "application/json" } },
      );
    }
    if (response.status === 404) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    if (!response.ok) throw new Error(`OpenGolfAPI returned ${response.status}`);

    const course = (await response.json()) as RawOpenGolfCourse;
    const scorecard = normalizeOpenGolfHoles(course);

    if (![9, 18].includes(scorecard.length)) {
      return NextResponse.json(
        {
          error: "This course does not have a complete scorecard yet. You can enter its pars manually.",
        },
        { status: 422 },
      );
    }

    const name = course.course_name || course.name || "Unnamed course";
    const detail: CourseDetail = {
      externalId: course.id,
      source: "opengolfapi",
      name,
      layoutName:
        (course.club_name && course.club_name !== name ? course.club_name : null) ||
        (course.name && course.name !== name ? course.name : null),
      city: course.city ?? null,
      state: course.state ?? null,
      holes: scorecard,
      teeName: null,
      sourceLicense: course._license || "ODbL-1.0",
    };

    return NextResponse.json({ course: detail });
  } catch {
    return NextResponse.json(
      { error: "We couldn’t load that scorecard. Try again or enter its pars manually." },
      { status: 502 },
    );
  }
}
