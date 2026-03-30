const JetraLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const dot = size === "sm" ? "w-1.5 h-1.5" : "w-2.5 h-2.5";

  return (
    <div className="flex items-center gap-1.5" role="status" aria-label="Loading">
      <span className={`loader-dot rounded-full bg-primary ${dot}`} style={{ animationDelay: "0s" }} />
      <span className={`loader-dot rounded-full bg-primary ${dot}`} style={{ animationDelay: "0.15s" }} />
      <span className={`loader-dot rounded-full bg-primary ${dot}`} style={{ animationDelay: "0.3s" }} />
    </div>
  );
};

export default JetraLoaderInline;
