const KEY = "tourist-home-scroll";

/** Call before `setPage("home")` to scroll to a section id after Home mounts. */
export function queueHomeSectionScroll(sectionId: string) {
  sessionStorage.setItem(KEY, sectionId);
}

export function takeQueuedHomeSectionScroll(): string | null {
  const v = sessionStorage.getItem(KEY);
  if (v) sessionStorage.removeItem(KEY);
  return v;
}
