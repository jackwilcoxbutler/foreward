import type {
  ResultCategory,
  RoundHole,
  RoundRecord,
  RoundType,
} from "./types";

export const RESULT_META: Record<
  ResultCategory,
  { label: string; shortLabel: string; box: string }
> = {
  eagle_or_better: {
    label: "Eagle or better",
    shortLabel: "Eagle+",
    box: "🟦",
  },
  birdie: { label: "Birdie", shortLabel: "Birdie", box: "🟩" },
  par: { label: "Par", shortLabel: "Par", box: "⬜" },
  bogey: { label: "Bogey", shortLabel: "Bogey", box: "🟨" },
  double_or_worse: {
    label: "Double bogey or worse",
    shortLabel: "Double+",
    box: "🟥",
  },
};

export const ROUND_TYPE_LABELS: Record<RoundType, string> = {
  front_9: "Front 9",
  back_9: "Back 9",
  nine_hole_course: "9 holes",
  full_18: "Full 18",
};

export function getResultCategory(score: number, par: number): ResultCategory {
  const difference = score - par;
  if (difference <= -2) return "eagle_or_better";
  if (difference === -1) return "birdie";
  if (difference === 0) return "par";
  if (difference === 1) return "bogey";
  return "double_or_worse";
}

export function formatToPar(scoreToPar: number) {
  if (scoreToPar === 0) return "E";
  return scoreToPar > 0 ? `+${scoreToPar}` : String(scoreToPar);
}

export function buildRoundHoles(
  holes: Array<{ courseHoleNumber: number; par: number; score: number }>,
): RoundHole[] {
  return holes.map((hole, index) => ({
    displayOrder: index + 1,
    courseHoleNumber: hole.courseHoleNumber,
    par: hole.par,
    score: hole.score,
    resultCategory: getResultCategory(hole.score, hole.par),
  }));
}

export function getRoundTotals(holes: Array<{ par: number; score: number }>) {
  const totalPar = holes.reduce((sum, hole) => sum + hole.par, 0);
  const totalScore = holes.reduce((sum, hole) => sum + hole.score, 0);
  return { totalPar, totalScore, scoreToPar: totalScore - totalPar };
}

export function buildShareMessage(round: RoundRecord, publicUrl: string) {
  const rows: string[] = [];
  for (let i = 0; i < round.holes.length; i += 9) {
    rows.push(
      round.holes
        .slice(i, i + 9)
        .map((hole) => RESULT_META[hole.resultCategory].box)
        .join(""),
    );
  }

  return [
    `⛳ ${round.courseName}`,
    "",
    ...rows,
    "",
    `${round.totalScore} (${formatToPar(round.scoreToPar)})`,
    "",
    "🟦 Eagle+",
    "🟩 Birdie",
    "⬜ Par",
    "🟨 Bogey",
    "🟥 Double+",
    "",
    publicUrl,
  ].join("\n");
}

export function countResults(holes: RoundHole[]) {
  return holes.reduce<Record<ResultCategory, number>>(
    (counts, hole) => {
      counts[hole.resultCategory] += 1;
      return counts;
    },
    {
      eagle_or_better: 0,
      birdie: 0,
      par: 0,
      bogey: 0,
      double_or_worse: 0,
    },
  );
}
