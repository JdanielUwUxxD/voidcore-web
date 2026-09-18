// Events created with the date picker use "YYYY-MM-DD". Older test events
// might have free-text dates we can't parse — treat those as upcoming so
// they never disappear unexpectedly.
export function isPastEvent(dateStr) {
  if (!dateStr) return false;
  const d = new Date(dateStr + "T23:59:59");
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}
