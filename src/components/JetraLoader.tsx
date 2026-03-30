const JetraLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-background">
    <div className="flex items-center gap-2" role="status" aria-label="Loading">
      <span className="loader-dot w-3 h-3 rounded-full bg-primary" style={{ animationDelay: "0s" }} />
      <span className="loader-dot w-3 h-3 rounded-full bg-primary" style={{ animationDelay: "0.15s" }} />
      <span className="loader-dot w-3 h-3 rounded-full bg-primary" style={{ animationDelay: "0.3s" }} />
    </div>
  </div>
);

export default JetraLoader;
