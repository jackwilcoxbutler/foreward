import { Flag } from "lucide-react";

export function BrandMark({ light = false }: { light?: boolean }) {
  return (
    <span className={`brand-mark${light ? " brand-mark-light" : ""}`}>
      <span className="brand-mark-icon" aria-hidden="true">
        <Flag size={17} strokeWidth={2.25} />
      </span>
      <span>Rounds</span>
    </span>
  );
}
