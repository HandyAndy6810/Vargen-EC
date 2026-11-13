/**
 * AI quote generation: the prompt, the model call, and every pricing step after
 * it (call-out fee, labour rate, cost basis, the tradie's price list through the
 * matching engine). What POST /api/quotes/generate does, moved out of the route
 * so the model comparison script (eval/) can run the very same code against
 * other models without going through HTTP, a session or the database.
 *
 * No database and no env here: the caller passes the user's data in (as
 * loaders, so a failed lookup is handled exactly where the route always
 * handled it) and says which model to use. Nothing is saved; the route saves
 * the generation record itself.
 */
import OpenAI from "openai";
import type { Quote, UserSettings } from "../../shared/schema";
import type { PriceRow } from "../../shared/price-list";
import type { Remembered } from "../../shared/matcher";
import { round2 } from "../../shared/money";
import { checkLinePrice } from "../../shared/price-sanity";
import { isHourlyUnit } from "../../shared/labour-panel";
import { applyPriceList, applyPriceMatches, newestPrices } from "../../shared/price-list";
import { resolveQuoteMatches } from "./quote-prices";
import { labourLineCost } from "./labour-cost";
import { resolvePricingInputs, enforceCallOut, type PricingInputs } from "./pricing-inputs";
import { getTradeContext } from "../trade-knowledge";
import type { Complete } from "./match-ai";

/** The one method of an OpenAI-style client this uses. */
export type ChatClient = {
  chat: { completions: { create(params: any, options?: any): Promise<any> } };
};

/**
 * Which model, and how to reach it. Pass a ready `client` (the server's shared
 * one), or `baseURL` and `apiKey` to have one made.
 */
export type ModelConfig = {
  model: string;
  client?: ChatClient | null;
  baseURL?: string;
  apiKey?: string;
};

export type GenerateRequest = {
  description: string;
  imageBase64?: unknown;
  customerName?: unknown;
  targetPrice?: unknown;
  /** The request body: pricing fallbacks for an account with no settings row. */
  body?: Record<string, unknown> | null;
};

export type QuoteData = {
  /** The user's SAVED settings (or undefined): the source of truth for pricing. */
  settings: UserSettings | undefined | null;
  loadPastQuotes: () => Promise<Quote[]>;
  loadPriceList: () => Promise<PriceRow[]>;
  loadRememberedMatches: () => Promise<Remembered[]>;
};

export type GenerateOptions = {
  /** Whether the model can see job photos (Groq's gpt-oss can't). */
  supportsVision: boolean;
  /** How long the matching engine's AI call may take. The tradie is watching. */
  matchTimeoutMs?: number;
  /** Called the moment a job photo is put in the request (the route's error message depends on it). */
  onImageSent?: () => void;
};

export type CallUsage = {
  purpose: "quote" | "matching";
  ms: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type GenerateResult = {
  /** Exactly what the route sends the phone (before the generation id is added). */
  quote: Record<string, any>;
  questions: Record<string, any>[];
  pricing: PricingInputs;
  /** The model's own words, before any pricing step touched them. */
  raw: string;
  usage: { promptTokens: number; completionTokens: number; totalTokens: number; calls: CallUsage[] };
  timing: { totalMs: number; generationMs: number };
};

/** The model's reply wasn't JSON. The route answers 500 with the raw text. */
export class InvalidAiJsonError extends Error {
  constructor(public raw: string) {
    super("AI returned invalid JSON");
    this.name = "InvalidAiJsonError";
  }
}

const clients = new Map<string, OpenAI>();
/** One client per provider and key (never logged: the key is only ever a map key in memory). */
function clientFor(ai: ModelConfig): ChatClient {
  // The server passes its shared client even when it's null (no API key): the
  // call then fails as it always did, rather than a new client being made.
  if (ai.client !== undefined) return ai.client as ChatClient;
  const k = `${ai.baseURL ?? ""}\n${ai.apiKey ?? ""}`;
  let c = clients.get(k);
  if (!c) {
    c = new OpenAI({ baseURL: ai.baseURL, apiKey: ai.apiKey });
    clients.set(k, c);
  }
  return c;
}

/** One JSON completion for the matching engine (server/lib/match-ai.ts): text only, no reasoning budget wasted. */
export function completeJsonWith(client: ChatClient, model: string): Complete {
  return async (system: string, user: string): Promise<string> => {
    const response = await client.chat.completions.create({
      model,
      messages: [{ role: "system", content: system }, { role: "user", content: user }],
      max_tokens: 900,
      temperature: 0,
      response_format: { type: "json_object" },
    });
    return response.choices[0]?.message?.content || "";
  };
}

/** Counts tokens and time for every call made through it. */
function metered(client: ChatClient, calls: CallUsage[], purpose: () => CallUsage["purpose"]): ChatClient {
  return {
    chat: {
      completions: {
        async create(params: any, options?: any) {
          const started = Date.now();
          const response = await client.chat.completions.create(params, options);
          const u = response?.usage ?? {};
          const promptTokens = Number(u.prompt_tokens) || 0;
          const completionTokens = Number(u.completion_tokens) || 0;
          calls.push({
            purpose: purpose(),
            ms: Date.now() - started,
            promptTokens,
            completionTokens,
            totalTokens: Number(u.total_tokens) || promptTokens + completionTokens,
          });
          return response;
        },
      },
    },
  };
}

export async function generateQuote(
  request: GenerateRequest,
  data: QuoteData,
  ai: ModelConfig,
  opts: GenerateOptions,
): Promise<GenerateResult> {
  const startedAt = Date.now();
  const calls: CallUsage[] = [];
  let phase: CallUsage["purpose"] = "quote";
  const openai = metered(clientFor(ai), calls, () => phase);
  const AI_MODEL = ai.model;
  const completeJson = completeJsonWith(openai, AI_MODEL);
  const { description, imageBase64, customerName, targetPrice } = request;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

  // Priced with the SAVED settings (server/lib/pricing-inputs.ts): the app's
  // cached copy could be a change behind, which is why a settings change only
  // applied "on the second attempt". The request body is only a fallback for
  // an account with no settings row. What was used goes back as `pricing`.
  const pricing = resolvePricingInputs(data.settings, request.body);
  const tradeType = pricing.tradeType;
  // labourRate is the CHARGE-OUT rate: what the customer pays per hour. Only
  // with "Mark up labour too" on does the markup apply to labour as well.
  const labourRateNum = pricing.labourRate;
  const markupNum = pricing.markupPercent;
  const markupLabourOn = pricing.markupLabour;
  const labourCostNum = pricing.labourCostRate;
  const callOutNum = pricing.callOutFee;
  const gstEnabled = pricing.includeGST;

  let pricingInstructions = "";
  if (labourRateNum && markupLabourOn) {
    pricingInstructions += `\n- Use a labour rate of $${labourRateNum}/hour for all labour items`;
  } else if (labourRateNum) {
    pricingInstructions += `\n- Charge all labour at the charge-out rate of $${labourRateNum}/hour. That is exactly what the customer pays per hour: do NOT mark up labour. The markup applies to materials only`;
  }
  if (markupNum > 0) {
    pricingInstructions += `\n- Apply a ${markupNum}% markup on all material costs (include the markup in the unit prices, do NOT show it as a separate line item)`;
  }
  if (callOutNum > 0) {
    pricingInstructions += `\n- Include a call-out/travel fee of $${callOutNum} as a separate line item`;
  } else {
    pricingInstructions += `\n- Do NOT include any call-out fee, site visit fee, or travel fee line item. The customer is not being charged for call-out.`;
  }
  if (gstEnabled) {
    pricingInstructions += `\n- Add 10% GST to the total. Include a "gstAmount" field in your response with the GST dollar amount. The "totalAmount" should be the GST-inclusive total`;
  } else {
    pricingInstructions += `\n- All prices are GST-exclusive. Mention "All prices exclude GST" in the notes`;
  }

  const targetPriceNum = typeof targetPrice === "number" && targetPrice > 0 ? targetPrice
    : typeof targetPrice === "string" && parseFloat(targetPrice) > 0 ? parseFloat(targetPrice)
    : null;
  if (targetPriceNum) {
    pricingInstructions += `\n- TARGET PRICE: The tradesperson expects this job to come in at approximately $${targetPriceNum}${gstEnabled ? " (GST inclusive)" : " (ex GST)"}. Shape your line items so the total lands close to this figure. Adjust labour hours and material specs to fit — if you cannot reach the target without being dishonest, note the shortfall in the "notes" field and explain why the true cost is higher. Do NOT sacrifice safety or compliance to hit the number.`;
  }

  // (The route also built a "The tradesperson is a …" sentence here that was
  // never used in the prompt; it's gone, which changes nothing the model sees.)
  const tradeKnowledge = getTradeContext(tradeType || "general");

  // Whether to ask was left entirely to the model, and it was inconsistent about
  // it — "build a house" came back with a finished quote and no questions while
  // "house" asked several. A description this thin cannot be priced honestly
  // without more detail, so the requirement is made deterministic here rather
  // than hoped for.
  const descText = String(description || "");
  const descWords = descText.trim().split(/\s+/).filter(Boolean).length;
  const descHasNumbers = /\d/.test(descText);
  const descIsThin = descWords < 8 || !descHasNumbers;
  const thinDescriptionRule = descIsThin
    ? `\n\nTHIS DESCRIPTION IS THIN: "${descText.trim()}". It gives you too little to price honestly — it is missing size, quantity, materials or scope. You MUST return 1-3 clarifying questions covering whichever of those matter most to the price. Still produce a complete, usable quote from your best assumptions; the questions only refine it. This overrides the "normally empty" guidance in rule 00.`
    : "";

  const businessProfile = [
    tradeType && tradeType !== "general" ? `Trade: ${tradeType}` : null,
    labourRateNum ? `Charge out rate: $${labourRateNum}/hr` : null,
    callOutNum > 0 ? `Callout fee: $${callOutNum}` : null,
    gstEnabled ? `GST: 10% included in totals` : `GST: all prices GST-exclusive`,
    markupNum > 0 ? `Materials markup: ${markupNum}%` : null,
  ].filter(Boolean).join('\n');

  const systemPrompt = `You are Trade Pal — an AI quoting assistant built specifically for Australian tradespeople. Your job is to generate fast, accurate, professional quotes that help tradies win work and get paid what they're worth.

You understand Australian trade work deeply: realistic 2025 pricing, AS/NZS compliance requirements, how clients think, and the small line items that most people forget (consumables, disposal, compliance paperwork, cleanup time). You write quotes that are specific enough to be legally defensible, yet clear enough that a client with no trade knowledge can understand exactly what they're getting.

${businessProfile ? `BUSINESS PROFILE — apply these settings to every quote:\n${businessProfile}\n` : ''}

You MUST respond with valid JSON in this exact format:
{
  "jobTitle": "Concise, professional job title (e.g. 'Hot Water System Replacement' not 'plumbing job')",
  "summary": "2-3 sentence professional summary of the scope of work, written for the client",
  "items": [
    {
      "description": "Specific item description — ALWAYS include size, spec, brand tier (e.g. '25mm copper elbow fitting x4', 'Rinnai B16 continuous flow HWS 16L/min', 'Labour – hot water system removal and install')",
      "quantity": 1,
      "unit": "each|hr|sqm|lm|lot",
      "category": "labour|material",
      "unitCost": 60.00,
      "unitPrice": 85.00
    }
  ],
  "questions": [],
  "notes": "Professional notes covering: key assumptions made, what is NOT included (exclusions), site access requirements, compliance notes, and any warranties offered",
  "estimatedHours": 4,
  "totalLabour": 340.00,
  "totalMaterials": 250.00,
  "subtotal": 590.00,
  "gstAmount": 59.00,
  "totalAmount": 649.00
}

${tradeKnowledge}

CRITICAL RULES — follow these exactly:
00. CLARIFYING QUESTIONS — "questions" is normally an EMPTY array. Only add a question
   when the description leaves out something that MATERIALLY changes the price and you
   cannot reasonably assume it. A well-described job must return []. Never ask for
   something already stated, never ask to be polite, and never ask more than 3.
   Each question is an object:
     { "q": "Single or double storey?", "type": "chips",
       "options": ["Single storey", "Double storey"],
       "assumption": "Quoted as single storey. Add ~$X if double." }
   "type" is "chips" (preferred, always give 2-4 options), "number" (a measurement —
   include "unit"), or "toggle" (yes/no). "assumption" states what you assumed when
   the tradesperson skips it, stating the assumed value and the cost impact where you
   can. Still produce a full, usable quote using your assumptions — the questions only
   refine it.
0. COST vs PRICE — every item needs BOTH:
   - "unitCost" = what the tradesperson PAYS per unit. For materials that's the supplier
     cost before any markup. For labour it's the true cost of that time to the business.
   - "unitPrice" = what the CLIENT is charged per unit (cost plus markup).
   - "category" = "material" for parts/materials/disposal/permits, "labour" for time on tools.
   unitCost must always be greater than 0 and less than or equal to unitPrice. Never copy
   unitPrice into unitCost — the app calculates the tradesperson's profit from the gap
   between them, so a wrong cost silently misreports what they earn.
1. LINE ITEMS must be specific. BAD: "Labour". GOOD: "Labour – remove existing hot water unit, install new unit, connect copper pipework and test". BAD: "Materials". GOOD: "25mm copper half-union x2 @ $18 each".
2. ALWAYS break labour and materials into SEPARATE line items. Never bundle them.
3. LIST ORDER: call-out/travel first (only if a call-out fee is specified in pricing instructions), then labour items, then materials, then any permit or disposal fees.
4. QUANTITIES must be real numbers — if 3 fittings are needed, quantity is 3, unitPrice is cost per fitting.
5. NEVER under-quote. Australian tradies routinely lose money from thin margins. Include: travel/setup time, consumables (tape, sealant, fixings), waste disposal where applicable, and at least 15 minutes of post-job cleanup time.
6. USE THE TRADE KNOWLEDGE BASE: All pricing must align with the reference data above. Use the estimation formulas provided to calculate quantities. Apply the correct units of measure for this trade.
7. NOTES section must include: what is NOT included (exclusions), assumptions made, relevant compliance requirements from the knowledge base, and quote validity period (14 days).
8. jobTitle must be professional and specific — suitable to show a client on a formal document.
9. CROSS-CHECK every price against the pricing reference before finalising. If a material or labour rate differs by more than 20% from the reference ranges, adjust it — unless the job description specifically calls for a premium brand, remote location, or unusual circumstance.
10. CHECK THE GOTCHAS: Review the trade-specific gotchas section and ensure your quote accounts for commonly missed items (e.g. disposal fees, compliance certificates, consumables allowance).
11. CONSISTENCY: Ensure line item descriptions and the notes/exclusions section do not contradict each other. If an item is included as a line item, do NOT exclude it in the notes. If something is genuinely excluded, it must not appear as a line item.${pricingInstructions}${thinDescriptionRule}`;

  messages.push({ role: "system", content: systemPrompt });

  // Learn from past quotes — recent ones the customer engaged with, as few-shot
  // examples. "invoiced" belongs here and was missing: a quote that reached an
  // invoice is the strongest evidence there is of a price a customer actually
  // paid, which is exactly what makes a good example. getQuotes already
  // returns newest first.
  try {
    const allQuotes = await data.loadPastQuotes();
    const PRICED_WELL = ["invoiced", "accepted", "sent"];
    const pastQuotes = allQuotes
      .filter(q => q.content && PRICED_WELL.includes(String(q.status)))
      .slice(0, 5);

    if (pastQuotes.length > 0) {
      const examples = pastQuotes.map(q => {
        try {
          const parsed = JSON.parse(q.content || "{}");
          return {
            jobTitle: parsed.jobTitle || parsed.title || "Untitled",
            totalAmount: q.totalAmount,
            itemCount: parsed.items?.length || 0,
            items: (parsed.items || []).slice(0, 5).map((item: any) => ({
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              unitPrice: item.unitPrice,
            })),
          };
        } catch {
          return null;
        }
      }).filter(Boolean);

      if (examples.length > 0) {
        const pastQuotesContext = `\n\nPAST QUOTES FROM THIS BUSINESS — Learn from these to match the tradesperson's pricing style and level of detail:\n${examples.map((ex, i) =>
          `Example ${i + 1}: "${ex!.jobTitle}" — $${ex!.totalAmount} total, ${ex!.itemCount} line items\n` +
          ex!.items.map((item: any) => `  • ${item.description} — qty ${item.quantity} ${item.unit || 'each'} @ $${item.unitPrice}`).join('\n')
        ).join('\n\n')}
\nUse these past quotes to calibrate your pricing. If the tradesperson consistently quotes higher or lower than the reference ranges, match their style. Maintain their level of detail and item granularity.`;

        messages.push({ role: "system", content: pastQuotesContext });
      }
    }
  } catch (err) {
    console.error("Failed to load past quotes for AI context:", err);
    // Non-critical — continue without past quote context
  }

  const userContent: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];

  userContent.push({
    type: "text",
    text: `Generate a quote for this job:\n\n${description}${customerName ? `\n\nClient: ${customerName}` : ""}`,
  });

  const imagePayload = typeof imageBase64 === 'string'
    ? imageBase64.includes(';base64,') ? imageBase64.split(';base64,')[1] : imageBase64
    : null;

  if (typeof imageBase64 === 'string' && imagePayload && imagePayload.length > 128 && opts.supportsVision) {
    opts.onImageSent?.();
    userContent.push({
      type: "image_url",
      image_url: {
        url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
        detail: "high",
      },
    });
  }

  messages.push({ role: "user", content: userContent });

  const generationStarted = Date.now();
  const response = await openai.chat.completions.create({
    model: AI_MODEL,
    messages,
    max_tokens: 4096,
    response_format: { type: "json_object" },
  });
  const generationMs = Date.now() - generationStarted;
  phase = "matching";

  const raw = response.choices[0]?.message?.content || "{}";
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidAiJsonError(raw);
  }

  // Post-generation reconciliation of the call-out fee — never trust the
  // LLM to include or exclude it correctly
  const callOutPattern = /call.?out|site.?visit|travel.?fee|call.?in|mobilisation/i;
  if (Array.isArray(parsed.items)) {
    let itemsChanged = false;
    if (callOutNum === 0) {
      // Strip call-out/travel items when no fee was requested
      const before = parsed.items.length;
      parsed.items = parsed.items.filter((item: any) => !callOutPattern.test(item.description || ""));
      itemsChanged = parsed.items.length !== before;
    } else if (!parsed.items.some((item: any) => callOutPattern.test(item.description || ""))) {
      // Fee was requested but the model omitted it — append deterministically
      parsed.items.push({ description: "Call-out fee", quantity: 1, unit: "ea", unitPrice: callOutNum });
      itemsChanged = true;
    }
    if (itemsChanged && parsed.items.length > 0) {
      const subtotal = parsed.items.reduce((sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
      parsed.subtotal = Math.round(subtotal * 100) / 100;
      parsed.gstAmount = gstEnabled ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
      parsed.totalAmount = Math.round((parsed.subtotal + parsed.gstAmount) * 100) / 100;
    }
  }

  // Clarifying questions are optional and capped — the tradie should only be
  // asked when the answer genuinely moves the price, never as a routine gate.
  parsed.questions = (Array.isArray(parsed.questions) ? parsed.questions : [])
    .filter((q: any) => q && typeof q.q === "string" && q.q.trim())
    .slice(0, 3)
    .map((q: any) => ({
      q: String(q.q).trim(),
      type: ["chips", "number", "toggle"].includes(q.type) ? q.type : "chips",
      options: Array.isArray(q.options) ? q.options.map(String).slice(0, 4) : [],
      unit: typeof q.unit === "string" ? q.unit : undefined,
      assumption: typeof q.assumption === "string" ? q.assumption : "",
    }));

  // Normalise the cost basis and note prices that look wrong.
  if (Array.isArray(parsed.items)) {
    parsed.items = parsed.items.map((item: any) => {
      const price = Number(item.unitPrice) || 0;

      // The cost the model gave, or nothing. This used to fabricate
      // `price * 0.7` whenever the model left it out or returned something
      // odd — which meant an invented price silently became an invented cost
      // and an invented profit, three made-up figures shown as data with
      // nothing marking them as guesses. An unknown cost is now left unknown:
      // the line reports no cost, and Review already says out loud that a
      // line without one is being counted as pure profit.
      const rawCost = Number(item.unitCost);
      const costKnown = Number.isFinite(rawCost) && rawCost > 0 && rawCost <= price;
      const unitCost = costKnown ? round2(rawCost) : 0;

      const category = String(item.category || "").toLowerCase() === "labour" ? "labour" : "material";

      // The prompt ASKS the model to use the tradie's labour rate, and a model
      // is free to ignore it — which is why the rate in settings never quite
      // matched the quote. What a job takes in HOURS is a judgement the AI is
      // reasonable at; what an hour COSTS is a fact the tradie already knows.
      // So the hours stand and the rate is imposed, for hourly lines only —
      // labour billed as a lot or a flat fee has no rate to apply.
      const hourly = isHourlyUnit(item.unit);
      const useRate = category === "labour" && hourly && labourRateNum;
      const unitPrice = useRate ? labourRateNum : price;
      // The price is the charge-out rate; see labourLineCost for the cost.
      const labourCost = labourLineCost({ rate: labourRateNum, markupLabour: markupLabourOn, costRate: labourCostNum });
      // Catches a figure that is wrong by an order of magnitude — the $20 five
      // litre tin of paint. Deliberately crude: it only ever adds a note.
      const flag = checkLinePrice({ description: item.description, unitPrice: price, unit: item.unit });

      return {
        ...item,
        category,
        unitPrice,
        unitCost: useRate ? (labourCost ?? 0) : unitCost,
        costUnknown: useRate ? labourCost == null : !costKnown,
        priceNote: flag?.message,
      };
    });
    // The saved call-out fee, exactly once, whatever the model did with it.
    parsed.items = enforceCallOut(parsed.items, callOutNum);
    // The tradie's own prices where they have one ("your price"); every other
    // material line is marked "estimate" (docs/pricing-design.md, step 2).
    // Before the capture, so the record compares the sent quote with exactly
    // what the phone received. A failed lookup only loses the badges.
    //
    // Through the matching engine (pricing step 4): remembered, plain, then
    // one batched AI call for lines still unmatched, so a receipt's "SL82 MESH"
    // reaches an AI line called "SL82 mesh sheet". If matching fails, plain
    // matching still applies; if that fails too, the AI's figures stand.
    try {
      const rows = await data.loadPriceList();
      try {
        // A tighter wait than receipts: the tradie is watching this quote build.
        const matches = await resolveQuoteMatches(parsed.items, rows, await data.loadRememberedMatches(), completeJson, { timeoutMs: opts.matchTimeoutMs ?? 8_000 });
        parsed.items = applyPriceMatches(parsed.items, matches, markupNum ?? 0);
      } catch (err) {
        console.error("[price list] matching failed; plain matching only:", err);
        parsed.items = applyPriceList(parsed.items, newestPrices(rows), markupNum ?? 0);
      }
    } catch (err) {
      console.error("[price list] lookup failed; the quote keeps the AI's figures:", err);
    }
  }
  // What this quote was priced with, so the phone prices with the same values
  // rather than its own (possibly older) copy of settings.
  parsed.pricing = {
    labourRate: labourRateNum, markupPercent: markupNum, markupLabour: markupLabourOn,
    labourCostRate: labourCostNum, callOutFee: callOutNum, includeGST: gstEnabled,
  };

  const sum = (k: "promptTokens" | "completionTokens" | "totalTokens") => calls.reduce((s, c) => s + c[k], 0);
  return {
    quote: parsed,
    questions: parsed.questions,
    pricing,
    raw,
    usage: { promptTokens: sum("promptTokens"), completionTokens: sum("completionTokens"), totalTokens: sum("totalTokens"), calls },
    timing: { totalMs: Date.now() - startedAt, generationMs },
  };
}
