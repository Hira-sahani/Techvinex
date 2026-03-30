/**
 * Inline X loader – smaller version of JetraLoader for use inside sections/buttons.
 * Shows the animated X without taking up the full screen.
 */
const JetraLoaderInline = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const dim = size === "sm" ? "w-6 h-6" : "w-10 h-10";
  const line = size === "sm" ? "w-4 h-[2px]" : "w-7 h-[3px]";

  return (
    <div className={`jetra-loader ${dim}`} role="status" aria-label="Loading">
      <span className={`jetra-loader__line jetra-loader__line--first ${line}`} />
      <span className={`jetra-loader__line jetra-loader__line--second ${line}`} />
    </div>
  );
};

export default JetraLoaderInline;
