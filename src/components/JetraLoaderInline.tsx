const JetraLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const dot = size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5";
  const gap = size === "sm" ? "gap-1" : "gap-1.5";

  return (
    <div className={`flex items-center ${gap}`} role="status" aria-label="Loading">
      {[0, 0.12, 0.24, 0.36, 0.48, 0.6].map((delay, i) => (
        <span
          key={i}
          className={`loader-dot rounded-full bg-primary ${dot}`}
          style={{ animationDelay: `${delay}s` }}
        />
      ))}
    </div>
  );
};

export default JetraLoaderInline;
