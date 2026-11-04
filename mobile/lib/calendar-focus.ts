/**
 * The day the calendar should open on next, set when a job is saved (j1). A job
 * booked for tomorrow used to save and drop you back on today's empty day,
 * which reads as "my job isn't there". The calendar takes this on focus.
 */
let pending: Date | null = null;

export function setCalendarFocus(date: Date | null) { pending = date; }

export function takeCalendarFocus(): Date | null {
  const d = pending;
  pending = null;
  return d;
}
