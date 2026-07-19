import { NextResponse } from "next/server";
import type { CourseSearchResult } from "@/lib/types";

const API_ROOT = "https://api.opengolfapi.org/v1";

type SearchCourse = {
  id: string;
  name?: string;
  course_name?: string;
  city?: string | null;
  state?: string | null;
  par?: number | null;
};

type DetailCourse = SearchCourse & {
  holes?: number | null;
  scorecard?: Array<{ hole: number; par: number }>;
};

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) {
    return NextResponse.json({ courses: [] });
  }

  try {
    const response = await fetch(
      `${API_ROOT}/courses/search?q=${encodeURIComponent(query)}`,
      { headers: { Accept: "application/json" } },
    );

    if (!response.ok) throw new Error(`OpenGolfAPI returned ${response.status}`);
    const payload = (await response.json()) as { courses?: SearchCourse[] };
    const baseCourses = (payload.courses ?? []).slice(0, 8);

    const courses = await Promise.all(
      baseCourses.map(async (course): Promise<CourseSearchResult> => {
        let detail: DetailCourse | null = null;
        try {
          const detailResponse = await fetch(`${API_ROOT}/courses/${course.id}`, {
            headers: { Accept: "application/json" },
          });
          if (detailResponse.ok) detail = (await detailResponse.json()) as DetailCourse;
        } catch {
          // Search results remain useful even if a detail enrichment times out.
        }

        const name = course.name || course.course_name || "Unnamed course";
        const courseName = course.course_name || course.name || name;
        return {
          id: course.id,
          name,
          courseName,
          layoutName: name !== courseName ? name : null,
          city: course.city ?? detail?.city ?? null,
          state: course.state ?? detail?.state ?? null,
          holes: detail?.scorecard?.length || detail?.holes || null,
          par: detail?.scorecard?.reduce((sum, hole) => sum + hole.par, 0) || course.par || null,
        };
      }),
    );

    return NextResponse.json({ courses });
  } catch {
    return NextResponse.json(
      {
        error: "Course search is taking a breather. Try again in a moment or enter the course manually.",
      },
      { status: 502 },
    );
  }
}
