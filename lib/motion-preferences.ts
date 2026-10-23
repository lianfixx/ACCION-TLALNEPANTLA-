export type MotionPreferences = { reduced: boolean; compact: boolean; pointer: boolean };

/** Rebuild visual effects only when a relevant device preference changes. */
export function observeMotionPreferences(
  setup: (preferences: MotionPreferences) => () => void,
  matchMedia: (query: string) => MediaQueryList = query => window.matchMedia(query),
) {
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const compact = matchMedia("(max-width: 1024px)");
  const pointer = matchMedia("(hover: hover) and (pointer: fine)");
  const queries = [reduced, compact, pointer];
  let dispose = () => {};
  let closed = false;
  const update = () => {
    if (closed) return;
    dispose();
    dispose = setup({ reduced: reduced.matches, compact: compact.matches, pointer: pointer.matches });
  };
  queries.forEach(query => query.addEventListener("change", update));
  update();
  return () => {
    if (closed) return;
    closed = true;
    queries.forEach(query => query.removeEventListener("change", update));
    dispose();
  };
}
