import Link from "next/link";
import { ArrowRight, Flag } from "lucide-react";
import { BrandMark } from "@/components/BrandMark";

export default function NotFound() {
  return (
    <main className="not-found-page">
      <Link href="/"><BrandMark /></Link>
      <div className="not-found-card">
        <span><Flag size={26} /></span>
        <p className="eyebrow">Out of bounds</p>
        <h1>We couldn’t find that round.</h1>
        <p>The link may have been mistyped, or the scorecard is no longer available.</p>
        <Link className="button button-primary button-large" href="/create">Create your round <ArrowRight size={18} /></Link>
      </div>
    </main>
  );
}
