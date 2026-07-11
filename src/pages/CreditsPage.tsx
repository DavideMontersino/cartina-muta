import { Link } from "wouter";
import { CreditsPanel } from "../components/CreditsPanel";

export function CreditsPage() {
  return (
    <div className="inner-page">
      <div className="inner-page__bar">
        <Link href="/" className="btn btn--ghost">
          ← Home
        </Link>
      </div>
      <div className="inner-page__body">
        <CreditsPanel />
      </div>
    </div>
  );
}
