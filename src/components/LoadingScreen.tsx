interface LoadingScreenProps {
  name: string;
  error: string | null;
  onBack: () => void;
}

export function LoadingScreen({ name, error, onBack }: LoadingScreenProps) {
  return (
    <div className="home">
      <div className="home__inner loading">
        {error ? (
          <>
            <p className="home__sub">{error}</p>
            <button type="button" className="btn btn--primary" onClick={onBack}>
              ← Torna alla mappa
            </button>
          </>
        ) : (
          <>
            <div className="spinner" aria-hidden />
            <p className="home__sub">Carico Provincia di {name}…</p>
          </>
        )}
      </div>
    </div>
  );
}
