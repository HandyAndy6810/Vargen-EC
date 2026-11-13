# Model comparison (eval)

A dev tool for choosing the quoting model. It runs the 20 job descriptions in
[`model-eval-set.md`](model-eval-set.md) through Vargen's real quote generator
with each model in [`models.json`](models.json), and writes a scorecard. Rerun it
whenever Groq retires or adds a model. **It changes nothing in the app.**

- It calls the same function as `POST /api/quotes/generate`
  (`server/lib/generate-quote.ts`): the same prompt, trade knowledge, pricing
  steps and price-list matching. Only the model changes.
- **Dev database only, read only.** It loads one user's settings, price list,
  remembered matches and past quotes. It saves nothing: no quotes, jobs,
  generation records or corrections. It refuses to start if the database
  resolves to production.
- **It costs money and needs keys**, so it is not part of CI. The scoring has
  unit tests, which are part of `npm test`.

## One-time setup (Replit)

1. **`EVAL_USER_ID`**: your user id **in the dev database** (not production).
   In the Replit Shell:

   ```bash
   git pull origin main
   npm run eval:models -- --find-user you@example.com
   ```

   Use the email you sign in to the **dev** app with (the Run button). It prints
   your id. Add it in **Replit → Secrets** as `EVAL_USER_ID`. If it says there's
   no such user, sign up once in the dev app first.

   Your dev account's settings (trade, charge-out rate, markup, call-out fee, GST)
   and price list are what every model is priced with. Set a charge-out rate:
   without one, every hourly labour line is the model's own rate, and the
   scorecard counts it as an invented price.

2. **Groq** needs nothing new. `AI_INTEGRATIONS_OPENAI_API_KEY` is already in
   Replit Secrets and is the Groq key.

3. **Optional other providers**: add their key in Secrets under the name given in
   `models.json` (`apiKeyEnv`). Today that's `ANTHROPIC_API_KEY` for the Claude
   entry. A model whose key isn't set is skipped with a message.

## Running it

```bash
npm run eval:models -- --list-models     # the models on your Groq account; * = in models.json
npm run eval:models -- --model groq-gpt-oss-120b --job C1 --runs 1   # a quick check
npm run eval:models                      # everything: every model, every job, 3 runs each
```

| Option | What it does |
|---|---|
| `--model <label>` | only this model (repeat it, or use commas: `--model a,b`) |
| `--job <id>` | only these jobs (`--job C1,C4,C5`) |
| `--runs <n>` | runs per job (default 3) |
| `--list-models` | list the provider's models, and say which models.json ids aren't on the account |
| `--find-user <email>` | print your dev user id |

Runs are sequential. A rate limit (429) or an overloaded provider (503) is
logged, waited out (the provider's `retry-after`, else 5 s, 10 s, 20 s, up to
120 s) and retried, up to 6 times. After that the run is recorded as failed,
never skipped silently. On Groq's free tier, the whole set (20 jobs × 3 runs ×
3 models, two calls each) can hit the daily token limit; run one model at a time
if it does.

A model id that isn't on your account (retired, or never enabled) is skipped
with a message, as is a model whose key isn't set.

## Output

Each run writes two files to `eval/results/` (gitignored):

- `<date>-<time>.md`: the scorecard
  - a summary table, one row per model: hard fails, must have pass rate, should
    have average, must not, trades, facts, question score, consistency, total
    spread, the hours pair, cost per quote and seconds per quote;
  - the hard fails by reason;
  - the C4/C5 hours pair;
  - every job, with every line item each model produced, so you can check it by eye;
  - the lines no check recognised, to improve the synonym lists in `jobs.json`.
- `<date>-<time>.json`: everything, including the raw model output.

## How it scores

The rules are in [`score.ts`](score.ts) (pure functions, tested in
`score.test.ts`). The expectations per job are in [`jobs.json`](jobs.json).

| Check | How |
|---|---|
| Must have | each item's synonyms, matched case-insensitively against the line items (name, description, quantity, unit, category). A missing one fails the run's must have. |
| Should have | counted and logged, **not pass or fail**. |
| Must not | anything present fails. |
| Trades | the trades the line items cover (a keyword list per trade in `score.ts`) against `expectedTrades`. Missing or invented trades fail. `optionalTrades` may appear either way. Demolition and handyman work show up inside other trades, so they're never counted as invented. |
| Facts | the numbers in the text (24 m², 100 mm, 8 downlights …) as a line's quantity in that unit, or written next to their unit anywhere in the quote (within 1%). |
| Questions | how many; asking when `expectNoQuestions`; the key question covered (keyword match); no more than 3 (counted before the generator caps them). |
| **Invented price** (hard fail) | a line whose price isn't from the price list ("your price"), isn't marked estimate, and isn't the saved charge-out rate or call-out fee. Labour priced as a lump sum counts. |
| **Compliance claim** (hard fail) | "complies with", "compliant with", "meets AS…", "in accordance with AS/NCC…". Flags like "engineering by others" and compliance certificates are fine. |
| Hours | C5 (45 m path) must have more labour than C4 (15 m). The ratio is logged; an exact 3× is flagged (setup time doesn't triple). Hours where both are hourly, else labour dollars. |
| Consistency | across a job's runs: how alike the line items are (paired by wording), and how far the totals spread. |
| Cost, speed | tokens × the price in `models.json`, and seconds per quote (both calls: the quote and the price-list matching). |

A run that errors also counts as a hard fail, since nothing shows it passed.

### Writing terms in `jobs.json`

A term is a word or phrase, matched at word boundaries and case-insensitively,
with a trailing s/es allowed (`post` matches "posts"). A term starting with `re:`
is a regular expression. A line item reads as
`description | quantity unit @ unitPrice | category`, so
`re:concrete[^|]*\|\s*[\d.]+\s*m3` means "concrete, sold in m3".

When the step 6 trade templates land, rerun it as is: the scorer reads the quote
as the phone receives it, and it also searches any new fields the templates add
(facts, flags, assumptions).

## Adding a model

Add an entry to `models.json`:

```json
{
  "label": "groq-some-model",
  "provider": "groq",
  "baseURL": "https://api.groq.com/openai/v1",
  "apiKeyEnv": "AI_INTEGRATIONS_OPENAI_API_KEY",
  "model": "vendor/model-id",
  "pricePerMillion": { "input": 0.1, "output": 0.3 },
  "priceSource": "https://groq.com/pricing (checked <date>)",
  "verified": true
}
```

Take the id from `--list-models`, and the price from the provider's own pricing
page. `apiKeyEnv` is the **name** of the secret, never the key. Any
OpenAI-compatible endpoint works.
