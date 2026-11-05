// No package imports (not even date-fns): the mobile app's CI installs only
// mobile/node_modules, which files in shared/ can't see.
const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const addDays = (d: Date, n: number) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
/** Whole calendar days from b to a, in local time (safe across daylight saving). */
const differenceInCalendarDays = (a: Date, b: Date) =>
  Math.round((Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) - Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) / 86_400_000);
/** The Monday of a date's week. */
const mondayOf = (d: Date) => addDays(startOfDay(d), -((d.getDay() + 6) % 7));

/**
 * The calendar's date maths (round 2, j1), in the phone's own time zone, so a
 * job for 9am tomorrow in Sydney is 9am tomorrow on the calendar. Pure, tested
 * in calendar-dates.test.ts (run in Australia/Sydney, across daylight saving).
 * No drizzle imports: the app uses it.
 */

/** Which week (0 = this one) and which day of it (0 = Monday) a date falls on. */
export function weekPosition(date: Date, now: Date): { weekOffset: number; dayIdx: number } {
  return {
    // Weeks start on Monday, as on the calendar.
    weekOffset: Math.round(differenceInCalendarDays(mondayOf(date), mondayOf(now)) / 7),
    dayIdx: (date.getDay() + 6) % 7,
  };
}

/** The same calendar day where the phone is, whatever the time. */
export function sameLocalDay(a: Date | string, b: Date): boolean {
  const d = typeof a === 'string' ? new Date(a) : a;
  return d.getFullYear() === b.getFullYear() && d.getMonth() === b.getMonth() && d.getDate() === b.getDate();
}

/**
 * The days a job can be booked on: today and the next 29. When editing a job
 * booked outside that window (in the past, or further out), its own day is
 * added so it keeps its date instead of moving to today on save.
 */
export function jobDayOptions(today: Date, existing?: Date | null): Date[] {
  const start = startOfDay(today);
  const days = Array.from({ length: 30 }, (_, i) => addDays(start, i));
  if (!existing) return days;
  const own = startOfDay(existing);
  const offset = differenceInCalendarDays(own, start);
  if (offset >= 0 && offset < 30) return days;
  return offset < 0 ? [own, ...days] : [...days, own];
}

/** "Today", "Tomorrow", "Yesterday" or the weekday, for a day chip. */
export function dayChipLabel(day: Date, today: Date, weekday: (d: Date) => string): string {
  const diff = differenceInCalendarDays(day, today);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  if (diff === -1) return 'Yesterday';
  return weekday(day);
}
