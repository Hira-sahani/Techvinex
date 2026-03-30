const LOADER_DELAYS = [0, 0.1, 0.2, 0.3, 0.4, 0.5];

const JetraLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const dotClass = size === "sm" ? "loader-dot--sm" : "loader-dot--md";
  const gapClass = size === "sm" ? "gap-1" : "gap-1.5";

  return (
    <div className={`loader-cluster ${gapClass}`} role="status" aria-label="Loading">
      {LOADER_DELAYS.map((delay, index) => (
        <span
          key={index}
          className={`loader-dot ${dotClass}`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
};

export default JetraLoaderInline;
