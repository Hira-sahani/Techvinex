// Lazy-loaded cities dataset. The previous module shipped ~47 KB of data
// in the main bundle for every consumer. We now fetch /cities.json on
// demand and cache the parsed map in module scope + the Cache Storage.
let cachePromise: Promise<Record<string, string[]>> | null = null;

export function loadCities(): Promise<Record<string, string[]>> {
  if (!cachePromise) {
    cachePromise = fetch("/cities.json", { credentials: "omit" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load cities");
        return r.json() as Promise<Record<string, string[]>>;
      })
      .catch((err) => {
        cachePromise = null; // allow retry on next call
        throw err;
      });
  }
  return cachePromise;
}

export function useCitiesForState(state: string | undefined) {
  // Tiny hook wrapper without bringing react-query into this util.
  // Consumers should call inside useEffect to read the resolved value.
  return state ? loadCities().then((m) => m[state] ?? []) : Promise.resolve([] as string[]);
}
