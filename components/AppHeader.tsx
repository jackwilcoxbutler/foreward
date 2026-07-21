import Link from "next/link";
import { BrandMark } from "./BrandMark";
import { AuthNav } from "./AuthNav";

export function AppHeader({ compact = false }: { compact?: boolean }) {
  return (
    <header className={`site-header${compact ? " site-header-compact" : ""}`}>
      <div className="site-header-inner">
        <Link href="/" aria-label="Rounds home">
          <BrandMark />
        </Link>
        {!compact && (
          <nav className="site-nav" aria-label="Main navigation">
            <AuthNav />
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
