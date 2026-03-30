const JetraLoader = () => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-white">
    <div className="jetra-loader text-primary" role="status" aria-label="Loading">
      <span className="jetra-loader__line jetra-loader__line--first" />
      <span className="jetra-loader__line jetra-loader__line--second" />
    </div>
  </div>
);

export default JetraLoader;
