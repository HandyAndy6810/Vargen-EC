/**
 * The shapes of eval/jobs.json and eval/models.json. See eval/README.md.
 *
 * A "term" is a word or phrase matched case-insensitively at word boundaries
 * (a trailing "s"/"es" is allowed, so "post" matches "posts"), or, when it
 * starts with "re:", a regular expression (case-insensitive).
 */
export type Term = string;

/** Where a check looks. */
export type Where = 'items' | 'questions' | 'any';

export type ItemCheck = {
  label: string;
  synonyms: Term[];
  /** Default "items": line item names and descriptions. */
  where?: Where;
  /** Only lines of this category count. */
  category?: 'labour' | 'material';
  /** A matched line must have this quantity, or say this number next to the item. */
  qty?: number;
  /** As well as a line matching `synonyms`, some line (or any text, for where "any") must match one of these. */
  alsoNeeds?: Term[];
  /** A line that also matches one of these doesn't count (e.g. "tap" on a "tap hose" line). */
  unlessLine?: Term[];
  /** Checks with the same group must be met by different lines (separate tasks). */
  group?: string;
  /** Not applicable when the tradie's call-out fee is off: the generator strips call-out lines then. */
  skipIfNoCallOut?: boolean;
};

export type MustNotCheck = ItemCheck & {
  /**
   * match (default): fails when `synonyms` match.
   * noItems: fails when the quote has any line items at all.
   * unflaggedAssumedSize: fails when the quote prices an area or length without
   *   asking for the size (`synonyms` are the size words) and saying it assumed one.
   */
  kind?: 'match' | 'noItems' | 'unflaggedAssumedSize';
};

export type FactNumber = { value: number; unit: string };
export type Fact = {
  label: string;
  /** Any one of these numbers, with its unit (or the item it counts), found in the quote. */
  numbers?: FactNumber[];
  /** Or any of these terms anywhere in the quote. */
  text?: Term[];
};

export type KeyQuestion = { text: string; synonyms: Term[] };

export type PairWith = {
  job: string;
  /** "larger": this job's labour must be more than the other's. */
  role: 'larger' | 'smaller';
  /** Logged only: how many of these each quote has (e.g. expansion joints). */
  compare?: ItemCheck[];
};

export type EvalJob = {
  id: string;
  title: string;
  text: string;
  mustHave: ItemCheck[];
  shouldHave: ItemCheck[];
  mustNot: MustNotCheck[];
  expectedTrades: string[];
  /** Trades that may appear without counting as invented (scored as should have). */
  optionalTrades?: string[];
  expectedFacts: Fact[];
  keyQuestion: KeyQuestion | null;
  expectNoQuestions: boolean;
  pairWith?: PairWith | null;
  /** Why an expectation is set the way it is, for the person reading the scorecard. */
  note?: string;
};

export type EvalModel = {
  label: string;
  provider: string;
  baseURL: string;
  /** The NAME of the env var holding the key. Never the key. */
  apiKeyEnv: string;
  model: string;
  /** US dollars per million tokens; null when there's no checked price. */
  pricePerMillion: { input: number; output: number } | null;
  priceSource: string;
  /** Whether the id and price were checked against the provider's own docs. */
  verified: boolean;
  baseline?: boolean;
  why?: string;
};
