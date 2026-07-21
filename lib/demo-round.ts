import { buildRoundHoles, getRoundTotals } from "./golf";
import type { RoundRecord } from "./types";

const demoScores = [4, 4, 3, 6, 5, 4, 3, 4, 4, 5, 4, 5, 4, 4, 3, 6, 7, 9];
const demoPars = [4, 5, 3, 4, 4, 4, 3, 5, 4, 4, 4, 3, 4, 5, 3, 4, 4, 5];

const demoHoles = buildRoundHoles(
  demoPars.map((par, index) => ({
    courseHoleNumber: index + 1,
    par,
    score: demoScores[index],
  })),
);
const totals = getRoundTotals(demoHoles);

export const DEMO_ROUND: RoundRecord = {
  shareId: "demo",
  courseSource: "opengolfapi",
  externalCourseId: "71fbf679-a787-40ce-aff6-a737901d02ac",
  courseName: "Hermitage Golf Course",
  courseLayoutName: null,
  city: "Nashville",
  state: "TN",
  teeName: null,
  roundType: "full_18",
  playedAt: "2026-07-12",
  totalScore: totals.totalScore,
  totalPar: totals.totalPar,
  scoreToPar: totals.scoreToPar,
  createdAt: "2026-07-12T22:18:00.000Z",
  sourceLicense: "ODbL-1.0",
  isPublic: true,
  holes: demoHoles,
};
