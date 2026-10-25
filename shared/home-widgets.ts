/**
 * The Home widgets, and how a saved layout (settings.bladeOrder) is read.
 * Customise Widgets and Home both use this, so the list and the screen always
 * agree: same default order, same handling of hidden and unknown entries.
 *
 * A saved layout is a JSON array of ids in display order; a hidden widget is
 * stored as "-id".
 */

export type HomeWidget = {
  id: string;
  label: string;
  description: string;
  /** Takes a whole row on Home; two neighbouring half-width widgets share one. */
  fullWidth: boolean;
};

export const HOME_WIDGETS: HomeWidget[] = [
  { id: 'upnext',       label: 'Up Next',           description: 'Your next scheduled job, front and centre', fullWidth: true },
  { id: 'quickactions', label: 'Quick Actions',     description: 'Follow up, add a receipt, customers',       fullWidth: true },
  { id: 'schedule',     label: 'Today\'s Schedule', description: 'Jobs on today and upcoming',                fullWidth: true },
  { id: 'outstanding',  label: 'Outstanding',       description: 'Unpaid & overdue invoice totals',           fullWidth: false },
  { id: 'weather',      label: 'Weather',           description: '7-day forecast + rain warnings',            fullWidth: true },
  { id: 'recentquotes', label: 'Recent Quotes',     description: 'Last 5 quotes with status',                 fullWidth: true },
  { id: 'pipeline',     label: 'Pipeline',          description: 'Quote funnel counts',                       fullWidth: false },
  { id: 'revenue',      label: 'Revenue',           description: 'Paid invoice total',                        fullWidth: false },
  { id: 'nudge',        label: 'AI Nudge',          description: 'Smart suggestions based on your data',      fullWidth: false },
];

export const DEFAULT_WIDGET_ORDER = HOME_WIDGETS.map((w) => w.id);

export type WidgetEntry = { id: string; visible: boolean };

/**
 * The column default in shared/schema.ts, from the old Home. Every account
 * that never saved a layout has it, so it means "no layout" — read literally,
 * its two surviving ids (pipeline, revenue) would jump to the top.
 */
const LEGACY_DEFAULT = ['hero', 'activity', 'pipeline', 'actions', 'revenue', 'stats', 'calendar'];
const isLegacyDefault = (v: unknown[]) =>
  v.length === LEGACY_DEFAULT.length && v.every((x, i) => x === LEGACY_DEFAULT[i]);

/**
 * Reads a saved layout into one entry per known widget, in saved order.
 * Unknown ids and duplicates are dropped (the first mention wins), hidden
 * entries stay hidden, and widgets the saved layout doesn't mention (added
 * since it was saved) go at the end, visible. Anything unreadable, and the
 * old column default, gives the default order.
 */
export function resolveWidgetLayout(raw: string | null | undefined): WidgetEntry[] {
  let parsed: unknown = null;
  try { parsed = raw ? JSON.parse(raw) : null; } catch { parsed = null; }

  const known = new Set(DEFAULT_WIDGET_ORDER);
  const seen = new Set<string>();
  const entries: WidgetEntry[] = [];
  if (Array.isArray(parsed) && !isLegacyDefault(parsed)) {
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const visible = !item.startsWith('-');
      const id = visible ? item : item.slice(1);
      if (!known.has(id) || seen.has(id)) continue;
      seen.add(id);
      entries.push({ id, visible });
    }
  }
  for (const id of DEFAULT_WIDGET_ORDER) {
    if (!seen.has(id)) entries.push({ id, visible: true });
  }
  return entries;
}

/** The layout as it is saved: ids in order, hidden ones prefixed with "-". */
export function serializeWidgetLayout(entries: WidgetEntry[]): string {
  return JSON.stringify(entries.map((e) => (e.visible ? e.id : `-${e.id}`)));
}

/**
 * Groups the widgets Home will draw into rows, keeping their order: a
 * full-width widget gets its own row, and two half-width widgets that sit next
 * to each other share one. `ids` should already exclude hidden widgets and
 * widgets with nothing to show.
 */
export function widgetRows(ids: string[]): string[][] {
  const full = new Map(HOME_WIDGETS.map((w) => [w.id, w.fullWidth]));
  const rows: string[][] = [];
  for (let i = 0; i < ids.length; i++) {
    const id = ids[i];
    const next = ids[i + 1];
    if (!full.get(id) && next !== undefined && !full.get(next)) {
      rows.push([id, next]);
      i++;
    } else {
      rows.push([id]);
    }
  }
  return rows;
}
