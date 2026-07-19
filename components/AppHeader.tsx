import Link from "next/link";
import { BrandMark } from "./BrandMark";

export function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " site-header-compact" : ""}`}>
      <div className="site-header-inner">
        <Link href="/" aria-label="Rounds home">
          <BrandMark />
        </Link>
        {!compact && (
          <nav className="site-nav" aria-label="Main navigation">
            <a href="#how-it-works">How it works</a>
            <Link className="button button-small button-dark" href="/create">
              Create a round
            </Link>
          </nav>
        )}
        {compact && (
          <Link className="header-link" href="/">
            Exit
          </Link>
        )}
      </div>
    </header>
  );
}
