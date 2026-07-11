import { Link } from "wouter";
import { LeaderboardPanel } from "../components/LeaderboardPanel";
import { decodeDifficulty, decodeMode } from "../leaderboard/constants";
import { getProvince } from "../maps/registry";

interface LeaderboardPageProps {
  provinceId: string;
}

export function LeaderboardPage({ provinceId }: LeaderboardPageProps) {
  const province = getProvince(provinceId);
  const params = new URLSearchParams(window.location.search);
  const mode = params.get("m") ? decodeMode(params.get("m") as string) : null;
  const difficulty = decodeDifficulty(params.get("d"));

  if (!province) {
    return (
      <div className="inner-page">
        <div className="inner-page__bar">
          <Link href="/" className="btn btn--ghost">
            ← Home
          </Link>
        </div>
        <p className="inner-page__empty">Provincia non trovata.</p>
      </div>
    );
  }

  return (
    <div className="inner-page">
      <div className="inner-page__bar">
        <Link href={`/?p=${provinceId}`} className="btn btn--ghost">
          ← {province.name}
        </Link>
      </div>
      <div className="inner-page__body">
        <LeaderboardPanel
          provinceId={provinceId}
          provinceName={province.name}
          difficulty={mode ? difficulty : undefined}
        />
      </div>
    </div>
  );
}
