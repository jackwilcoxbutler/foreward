import { NextResponse } from "next/server";
import type { CourseDetail } from "@/lib/types";

const API_ROOT = "https://api.opengolfapi.org/v1";

type OpenGolfDetail = {
  id: string;
  name?: string;
  course_name?: string;
  city?: string | null;
  state?: string | null;
  scorecard?: Array<{ hole: number; par: number }>;
  _license?: string;
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ courseId: string }> },
) {
  const { courseId } = await params;

  try {
    const response = await fetch(
      `${API_ROOT}/courses/${encodeURIComponent(courseId)}`,
      { headers: { Accept: "application/json" } },
    );
    if (response.status === 404) {
      return NextResponse.json({ error: "Course not found." }, { status: 404 });
    }
    if (!response.ok) throw new Error(`OpenGolfAPI returned ${response.status}`);

    const course = (await response.json()) as OpenGolfDetail;
    const scorecard = (course.scorecard ?? [])
      .filter(
        (hole) =>
          Number.isInteger(hole.hole) &&
          Number.isInteger(hole.par) &&
          hole.par >= 2 &&
          hole.par <= 7,
      )
      .sort((a, b) => a.hole - b.hole);

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
      layoutName: course.name && course.name !== name ? course.name : null,
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
