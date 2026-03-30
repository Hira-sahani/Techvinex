const JetraLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
    <div className="flex items-center gap-2.5" role="status" aria-label="Loading">
      {[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((delay, i) => (
        <span
          key={i}
          className="loader-dot w-3 h-3 rounded-full bg-primary"
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  </div>
);

export default JetraLoader;
