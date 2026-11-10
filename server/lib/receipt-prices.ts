/**
 * Price a saved receipt (docs/pricing-design.md, Build order step 4, part 3):
 * match its lines (shared/matcher), turn matched material lines into the
 * tradie's prices (shared/receipt-pricing) and write them with source
 * 'receipt'. Uncertain lines are returned (and queued for the tradie in the
 * "Not sure what this is" list).
 *
 * Replace, never add: the receipt's previous prices (and open questions) are
 * cleared first, so saving the same receipt twice, or editing it, never
 * doubles anything. The receipt's own date is the price's date, so an older
 * receipt never beats a newer price (shared/price-list newestPrices).
 */
import { storage } from "../storage";
import { newestPrices } from "../../shared/price-list";
import { localMatch, decideAi, lineKey, supplierKey, type Match, type Guess } from "../../shared/matcher";
import { receiptCandidates } from "../../shared/match-candidates";
import { pricingSkip, pricedLines, priceFromMatch, receiptPriceDate, type SkipReason } from "../../shared/receipt-pricing";
import type { PriceEntry } from "../../shared/price-list";
import { aiMatchLines, type Complete } from "./match-ai";

/** A line we couldn't place, as the tradie will see it. */
export type UnsureLine = {
  lineIndex: number;
  text: string;
  unit: string | null;
  quantity: number;
  /** What one of these cost, as paid (GST as printed). */
  perUnit: number;
  amount: number;
  guess: Guess | null;
};

export type ReceiptPricingResult = {
  saved: number;
  ignored: number;
  heldBack: number;
  unsure: UnsureLine[];
  skipped: SkipReason | 'not_found' | null;
};

export async function priceReceipt(userId: string, receiptId: number, complete: Complete): Promise<ReceiptPricingResult> {
  const result: ReceiptPricingResult = { saved: 0, ignored: 0, heldBack: 0, unsure: [], skipped: null };
  const receipt = await storage.getReceipt(receiptId, userId);
  if (!receipt) return { ...result, skipped: "not_found" };

  // Whatever this receipt taught before goes first: a re-save or an edit replaces it.
  await storage.deleteReceiptPrices(userId, receiptId);
  await storage.clearUnsureForReceipt(userId, receiptId);

  const skip = pricingSkip(receipt);
  if (skip) return { ...result, skipped: skip };
  const lines = pricedLines(receipt);
  if (!lines.length) return { ...result, skipped: "no_lines" };

  const list = [...newestPrices(await storage.getPriceList(userId)).values()];
  const settings = await storage.getUserSettings(userId);
  const candidates = receiptCandidates(list, settings?.tradeType);
  const remembered = await storage.getRememberedMatches(userId);
  const supplier = receipt.vendor ?? "";

  // Remembered and plain first; one AI call for whatever's left.
  const inputs = lines.map((l) => ({ text: l.line.description, unit: l.line.unit ?? "", supplier }));
  const matches: Match[] = inputs.map((inp) => localMatch(inp, candidates, remembered));
  const askIdx = matches.flatMap((m, i) => (m.kind === "needs_ai" ? [i] : []));
  if (askIdx.length) {
    const suggestions = await aiMatchLines(complete, askIdx.map((i) => inputs[i]), candidates);
    askIdx.forEach((i, k) => { matches[i] = decideAi(inputs[i], suggestions[k], candidates); });
  }

  const entries: PriceEntry[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = matches[i];
    const l = lines[i];
    if (m.kind === "ignore") { result.ignored++; continue; }
    if (m.kind === "matched") {
      const entry = priceFromMatch(receipt, l, m);
      if (entry) entries.push(entry); else result.heldBack++;
      // A confident AI match is remembered, so this line never needs the AI again;
      // a remembered one is touched (last used).
      if (m.via !== "plain") {
        await storage.rememberMatch(userId, {
          lineKey: lineKey(l.line.description), supplierKey: supplierKey(supplier),
          item: m.item, unit: m.unit, factor: m.factor, ignore: false,
        });
      }
      continue;
    }
    result.unsure.push({
      lineIndex: l.index, text: l.line.description, unit: l.line.unit ?? null,
      quantity: l.quantity, perUnit: l.perUnit, amount: l.line.amount,
      guess: m.kind === "unsure" ? m.guess ?? null : null,
    });
  }

  result.saved = await storage.addPrices(userId, entries, {
    source: "receipt", receiptId, supplier: receipt.vendor, priceDate: receiptPriceDate(receipt),
  });
  await storage.queueUnsure(userId, receiptId, receipt.vendor ?? null, receipt.receiptDate ?? null, result.unsure);
  return result;
}
