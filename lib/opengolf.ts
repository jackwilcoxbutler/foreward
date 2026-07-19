import type { HolePar } from "./types";

export const OPENGOLF_API_ORIGIN = "https://api.opengolfapi.org";

export type RawOpenGolfHole = {
  hole?: unknown;
  number?: unknown;
  par?: unknown;
};

export type RawOpenGolfCourse = {
  id: string;
  name?: string;
  course_name?: string;
  club_name?: string;
  city?: string | null;
  state?: string | null;
  holes?: unknown;
  par?: unknown;
  scorecard?: RawOpenGolfHole[];
  holes_data?: RawOpenGolfHole[];
  _license?: string;
};

function integer(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

function candidateHoles(course: RawOpenGolfCourse) {
  const detailedHoles = Array.isArray(course.holes_data) ? course.holes_data : [];
  const basicHoles = Array.isArray(course.scorecard) ? course.scorecard : [];
  const source = detailedHoles.length ? detailedHoles : basicHoles;
  const byNumber = new Map<number, number>();

  for (const rawHole of source) {
    const number = integer(rawHole.number ?? rawHole.hole);
    const par = integer(rawHole.par);
    if (number === null || par === null || number < 1 || par < 2 || par > 7) continue;
    if (!byNumber.has(number)) byNumber.set(number, par);
  }

  return byNumber;
}

function completeCard(byNumber: Map<number, number>, holeCount: 9 | 18) {
  const holes: HolePar[] = [];
  for (let hole = 1; hole <= holeCount; hole += 1) {
    const par = byNumber.get(hole);
    if (par === undefined) return [];
    holes.push({ hole, par });
  }
  return holes;
}

/**
 * OpenGolf records occasionally contain trailing placeholder holes. The
 * declared course length and total par are the contract; only a complete,
 * sequential 9- or 18-hole card that agrees with that contract is accepted.
 */
export function normalizeOpenGolfHoles(course: RawOpenGolfCourse): HolePar[] {
  const byNumber = candidateHoles(course);
  const declaredHoles = integer(course.holes);
  const declaredPar = integer(course.par);
  const possibleCounts: Array<9 | 18> = [];

  if (declaredHoles === 9 || declaredHoles === 18) {
    possibleCounts.push(declaredHoles);
  } else {
    if (byNumber.size === 9) possibleCounts.push(9);
    if (byNumber.size === 18) possibleCounts.push(18);
    // Some malformed records have trailing placeholder rows but a reliable
    // total par. Test the two supported prefixes against that total.
    if (byNumber.size > 18) possibleCounts.push(9, 18);
  }

  for (const count of possibleCounts) {
    const holes = completeCard(byNumber, count);
    if (!holes.length) continue;
    const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
    if (declaredPar !== null && totalPar !== declaredPar) continue;
    return holes;
  }

  return [];
}
