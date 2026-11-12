/**
 * Share to Vargen (docs/pricing-design.md, Build order step 5): what came in,
 * and the menu it gets ("What do you want to do with this?").
 *
 * The share target itself (expo-share-intent) only hands the main app a list of
 * files and/or text. Everything here is pure: what kind of thing each item is,
 * which actions it offers, which one is the default, and reading a contact
 * card. Tested in share-intake.test.ts.
 */

export type SharedFile = { path: string; mimeType: string; fileName?: string | null; size?: number | null };
export type SharedInput = { text?: string | null; webUrl?: string | null; files?: SharedFile[] | null };

/** What one shared item is. */
export type ShareKind = 'image' | 'pdf' | 'text' | 'contact' | 'unsupported';

export type ShareAction =
  /** Supplier invoice or receipt: read it and add it to expenses (prices update, step 4). */
  | 'expense'
  /** The same, linked to one of their jobs. */
  | 'expense_job'
  /** Job site photo: keep it on a job. */
  | 'job_photo'
  /** Job site photo: keep it on a quote. */
  | 'quote_photo'
  /** Photo: start a new quote with it. */
  | 'quote_from_photo'
  /** A customer's message or email: start a quote with the text in Describe. */
  | 'quote_from_text'
  /** A customer's message or email: add it to a customer's notes. */
  | 'customer_note'
  /** A contact card: save as a customer. */
  | 'save_customer';

export const ACTION_LABELS: Record<ShareAction, string> = {
  expense: 'Add to expenses',
  expense_job: 'Add to expenses, linked to a job',
  job_photo: 'Add to a job',
  quote_photo: 'Attach to a quote',
  quote_from_photo: 'Start a quote from this',
  quote_from_text: 'Start a quote from this',
  customer_note: "Save to a customer's notes",
  save_customer: 'Save as customer',
};

/** The plain message for anything Vargen can't take. */
export const CANT_USE = "Vargen can't use this kind of file.";

export function kindOf(file: { mimeType?: string | null; fileName?: string | null; path?: string | null }): ShareKind {
  const mime = String(file.mimeType ?? '').toLowerCase();
  const name = String(file.fileName ?? file.path ?? '').toLowerCase();
  if (mime.startsWith('image/') && !mime.includes('svg')) return 'image';
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf';
  if (mime === 'text/vcard' || mime === 'text/x-vcard' || mime === 'text/directory' || name.endsWith('.vcf')) return 'contact';
  if (mime === 'text/plain' || name.endsWith('.txt')) return 'text';
  return 'unsupported';
}

/**
 * The share as items the menu can work on. Text comes first if there is any
 * (a message), then each file. Unsupported files are kept so the app can say so.
 */
export type ShareItem =
  | { kind: 'text'; text: string }
  | { kind: Exclude<ShareKind, 'text'>; file: SharedFile };

export function shareItems(input: SharedInput): ShareItem[] {
  const items: ShareItem[] = [];
  const text = [input.text, input.webUrl].filter((t) => typeof t === 'string' && t.trim()).join('\n').trim();
  if (text) items.push({ kind: 'text', text: text.slice(0, 20_000) });
  for (const f of input.files ?? []) {
    const k = kindOf(f);
    items.push(k === 'text' ? { kind: 'unsupported', file: f } : { kind: k, file: f });
  }
  return items;
}

/** What each kind of item offers, in the doc's order (before the AI reorders). */
export function actionsFor(kind: ShareKind): ShareAction[] {
  switch (kind) {
    case 'pdf': return ['expense', 'expense_job'];
    case 'image': return ['expense', 'expense_job', 'job_photo', 'quote_photo', 'quote_from_photo'];
    case 'text': return ['quote_from_text', 'customer_note'];
    case 'contact': return ['save_customer'];
    default: return [];
  }
}

/**
 * The menu for a share: the first item decides it, and the same choice applies
 * to every item ("several files: the same menu, applied to all"). Items of a
 * different kind than the first that can't take the chosen action are named
 * so the app can say they were skipped. A suggested action (the AI's guess) is
 * moved to the front when it's one of the options; otherwise the doc's default
 * stays first. The tradie always picks: nothing happens without a tap.
 */
export function shareMenu(items: ShareItem[], suggested?: ShareAction | null): { kind: ShareKind; actions: ShareAction[] } {
  const usable = items.filter((i) => i.kind !== 'unsupported');
  if (!usable.length) return { kind: 'unsupported', actions: [] };
  const kind = usable[0].kind;
  const actions = actionsFor(kind);
  if (suggested && actions.includes(suggested)) {
    return { kind, actions: [suggested, ...actions.filter((a) => a !== suggested)] };
  }
  return { kind, actions };
}

/** The items a chosen action applies to (same-kind as the first usable item, or compatible). */
export function itemsForAction(items: ShareItem[], action: ShareAction): ShareItem[] {
  return items.filter((i) => i.kind !== 'unsupported' && actionsFor(i.kind).includes(action));
}

// ── Contact cards ────────────────────────────────────────────────────────────

export type ContactCard = { name: string; phone: string | null; email: string | null; address: string | null; company: string | null };

/** vCard text escapes: \n, \, \; and \\. */
const unescape = (s: string) => s.replace(/\\n/gi, '\n').replace(/\\([,;\\])/g, '$1').trim();

/**
 * The first contact in a vCard (2.1, 3.0 or 4.0): name, first phone (mobile
 * preferred), first email, first address, organisation. Folded lines are
 * joined. Returns null when there's no name, phone or email to save.
 */
export function parseVCard(raw: string): ContactCard | null {
  const text = String(raw ?? '').replace(/\r\n[ \t]/g, '').replace(/\n[ \t]/g, '');
  const start = text.search(/BEGIN:VCARD/i);
  if (start < 0) return null;
  const body = text.slice(start).split(/END:VCARD/i)[0];
  const lines = body.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const props: { name: string; params: string; value: string }[] = [];
  for (const line of lines) {
    const i = line.indexOf(':');
    if (i < 0) continue;
    const head = line.slice(0, i);
    const value = line.slice(i + 1);
    const [nameRaw, ...params] = head.split(';');
    const name = nameRaw.replace(/^item\d+\./i, '').toUpperCase();
    props.push({ name, params: params.join(';').toUpperCase(), value });
  }
  const first = (n: string) => props.find((p) => p.name === n);
  const fn = first('FN')?.value;
  const n = first('N')?.value;
  let name = fn ? unescape(fn) : '';
  if (!name && n) {
    const [family, given, middle] = n.split(';').map(unescape);
    name = [given, middle, family].filter(Boolean).join(' ');
  }
  const tels = props.filter((p) => p.name === 'TEL');
  const tel = tels.find((p) => /CELL|MOBILE/.test(p.params)) ?? tels[0];
  const phone = tel ? unescape(tel.value.replace(/^tel:/i, '')) : null;
  const emailP = first('EMAIL');
  const email = emailP ? unescape(emailP.value.replace(/^mailto:/i, '')) : null;
  const adr = first('ADR');
  const address = adr
    ? adr.value.split(';').map(unescape).filter(Boolean).join(', ')
    : null;
  const org = first('ORG');
  const company = org ? org.value.split(';').map(unescape).filter(Boolean).join(', ') : null;
  if (!name) name = company ?? email ?? phone ?? '';
  if (!name && !phone && !email) return null;
  return { name: name.slice(0, 120), phone: phone || null, email: email || null, address: address || null, company: company || null };
}

// ── The AI's suggestion (server asks; this reads the answer) ─────────────────

/**
 * Read the AI's one-word guess about a shared photo or message into the action
 * to put first. A photo is a receipt/supplier invoice (→ Add to expenses) or a
 * job site photo (→ Add to a job); a message is a request for work (→ Start a
 * quote) or not (→ Save to a customer's notes). Anything else: null, and the
 * doc's default order stands. The tradie always picks.
 */
export function suggestionFromAi(kind: 'image' | 'text', raw: unknown): ShareAction | null {
  let doc: any = raw;
  if (typeof raw === 'string') { try { doc = JSON.parse(raw); } catch { return null; } }
  const v = String(doc?.kind ?? '').toLowerCase();
  if (kind === 'image') {
    if (v === 'receipt' || v === 'invoice') return 'expense';
    if (v === 'site' || v === 'job') return 'job_photo';
    return null;
  }
  if (v === 'request' || v === 'quote') return 'quote_from_text';
  if (v === 'note' || v === 'other') return 'customer_note';
  return null;
}
