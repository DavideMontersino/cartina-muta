import { Link } from "wouter";
import rawEntries from "../data/changelog.json";

interface Entry {
  date: string;
  sha: string;
  description: string;
}

const REPO = "https://github.com/DavideMontersino/cartina-muta";

export function ChangelogPage() {
  const entries = rawEntries as Entry[];
  return (
    <div className="inner-page">
      <div className="inner-page__bar">
        <Link href="/" className="btn btn--ghost">
          ← Home
        </Link>
      </div>
      <h1 className="inner-page__title">Novità</h1>
      <div className="inner-page__body">
        {entries.length === 0 ? (
          <p className="inner-page__empty">Nessuna novità ancora.</p>
        ) : (
          <ol className="changelog">
            {entries.map((e) => (
              <li key={e.sha} className="changelog__entry">
                <time className="changelog__date">{e.date}</time>
                <p className="changelog__desc">{e.description}</p>
                <a
                  href={`${REPO}/commit/${e.sha}`}
                  className="changelog__sha"
                  target="_blank"
                  rel="noreferrer"
                >
                  {e.sha.slice(0, 7)}
                </a>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
