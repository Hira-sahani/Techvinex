const LOADER_DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

const JetraLoader = () => (
  <div className="loader-overlay" role="status" aria-live="polite" aria-label="Loading">
    <div className="loader-shell">
      <div className="loader-cluster" aria-hidden="true">
        {LOADER_DELAYS.map((delay, index) => (
          <span
            key={index}
            className="loader-dot loader-dot--lg"
            style={{ animationDelay: `${delay}s` }}
          />
        ))}
      </div>
      <p className="loader-caption">Loading…</p>
    </div>
  </div>
);

export default JetraLoader;
