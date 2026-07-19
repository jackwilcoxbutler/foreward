export type ResultCategory =
  | "eagle_or_better"
  | "birdie"
  | "par"
  | "bogey"
  | "double_or_worse";

export type RoundType =
  | "front_9"
  | "back_9"
  | "nine_hole_course"
  | "full_18";

export type CourseSource = "opengolfapi" | "manual";

export interface HolePar {
  hole: number;
  par: number;
}

export interface CourseSearchResult {
  id: string;
  name: string;
  courseName: string;
  layoutName: string | null;
  city: string | null;
  state: string | null;
  holes: number | null;
  par: number | null;
}

export interface CourseDetail {
  externalId: string | null;
  source: CourseSource;
  name: string;
  layoutName: string | null;
  city: string | null;
  state: string | null;
  holes: HolePar[];
  teeName: string | null;
  sourceLicense: string;
}

export interface RoundHole {
  displayOrder: number;
  courseHoleNumber: number;
  par: number;
  score: number;
  resultCategory: ResultCategory;
}

export interface RoundRecord {
  shareId: string;
  courseSource: CourseSource;
  externalCourseId: string | null;
  courseName: string;
  courseLayoutName: string | null;
  city: string | null;
  state: string | null;
  teeName: string | null;
  roundType: RoundType;
  playedAt: string;
  totalScore: number;
  totalPar: number;
  scoreToPar: number;
  createdAt: string;
  sourceLicense: string;
  holes: RoundHole[];
}

export interface SaveRoundPayload {
  course: CourseDetail;
  roundType: RoundType;
  playedAt: string;
  holes: Array<{
    courseHoleNumber: number;
    par: number;
    score: number;
  }>;
}
