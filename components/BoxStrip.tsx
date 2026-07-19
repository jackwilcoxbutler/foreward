import { RESULT_META } from "@/lib/golf";
import type { RoundHole } from "@/lib/types";

export function BoxStrip({ holes, compact = false }: { holes: RoundHole[]; compact?: boolean }) {
  return (
    <div className={`box-strip${compact ? " box-strip-compact" : ""}`} aria-label="Hole results">
      {holes.map((hole) => (
        <span
          className={`score-box score-box-${hole.resultCategory}`}
          title={`Hole ${hole.courseHoleNumber}: ${RESULT_META[hole.resultCategory].label}`}
          key={`${hole.displayOrder}-${hole.courseHoleNumber}`}
        />
      ))}
    </div>
  );
}
