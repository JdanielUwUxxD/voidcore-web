// Events created with the date picker use "YYYY-MM-DD". Older test events
// might have free-text dates we can't parse — treat those as upcoming so
// they never disappear unexpectedly. If the event has an end date, it only
// counts as "past" once that end date has gone by.
export function isPastEvent(dateStart, dateEnd) {
  const target = dateEnd || dateStart;
  if (!target) return false;
  const d = new Date(target + "T23:59:59");
  if (isNaN(d.getTime())) return false;
  return d.getTime() < Date.now();
}
