import type { HolePar, SavedCourseRecord } from "./types";

export type SavedCourseRow = {
  id: string;
  course_source: "opengolfapi" | "custom";
  external_course_id: string | null;
  name: string;
  layout_name: string | null;
  city: string | null;
  state: string | null;
  tee_name: string | null;
  source_license: string;
  holes: unknown;
  is_favorite: boolean;
  is_custom: boolean;
  last_played_at: string | null;
  created_at: string;
};

export function validHolePars(value: unknown): HolePar[] | null {
  if (!Array.isArray(value) || ![9, 18].includes(value.length)) return null;
  const holes: HolePar[] = [];
  for (let index = 0; index < value.length; index += 1) {
    if (!value[index] || typeof value[index] !== "object") return null;
    const raw = value[index] as Partial<HolePar>;
    if (
      !Number.isInteger(raw.hole) ||
      raw.hole !== index + 1 ||
      !Number.isInteger(raw.par) ||
      (raw.par as number) < 2 ||
      (raw.par as number) > 7
    ) {
      return null;
    }
    holes.push({ hole: raw.hole as number, par: raw.par as number });
  }
  return holes;
}

export function savedCourseFromRow(row: SavedCourseRow): SavedCourseRecord | null {
  const holes = validHolePars(row.holes);
  if (!holes) return null;
  return {
    savedCourseId: row.id,
    externalId: row.external_course_id,
    source: row.is_custom ? "custom" : "opengolfapi",
    name: row.name,
    layoutName: row.layout_name,
    city: row.city,
    state: row.state,
    teeName: row.tee_name,
    sourceLicense: row.source_license,
    holes,
    isFavorite: row.is_favorite,
    isCustom: row.is_custom,
    lastPlayedAt: row.last_played_at,
    createdAt: row.created_at,
  };
}
