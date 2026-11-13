/**
 * POST /api/quotes/generate: the request and response around generateQuote
 * (server/lib/generate-quote.ts). Validation, the user's data from storage, the
 * generation record, and the error messages the phone shows. The model is the
 * one the server was configured with (AI_CHAT_MODEL, see ai-config.ts).
 *
 * A factory so the route can be tested with a stub storage and a fake AI
 * server (generate-quote-route.test.ts) without a database or a session.
 */
import type { IStorage } from "../storage";
import { generateQuote, InvalidAiJsonError, type ModelConfig } from "./generate-quote";
import { generationInput, cleanDraftKey, captureGeneration } from "./ai-capture";

export type GenerateRouteDeps = {
  storage: Pick<IStorage, "getUserSettings" | "getQuotes" | "getPriceList" | "getRememberedMatches" | "createAiGeneration">;
  /** The server's chat model and client. */
  ai: ModelConfig;
  supportsVision: boolean;
};

export function generateQuoteRoute(deps: GenerateRouteDeps) {
  const { storage, ai } = deps;
  return async (req: any, res: any) => {
    // Declared out here, not inside the try: `let` is block-scoped, so the catch
    // below could not see it and threw a ReferenceError of its own every time a
    // generation failed — losing the real provider error behind a bare 500.
    let sentImage = false;
    try {
      const { description, imageBase64, customerName, targetPrice } = req.body;

      if (!description || typeof description !== "string") {
        return res.status(400).json({ message: "Job description is required" });
      }

      let result;
      try {
        result = await generateQuote(
          { description, imageBase64, customerName, targetPrice, body: req.body },
          {
            settings: await storage.getUserSettings(req.userId),
            loadPastQuotes: () => storage.getQuotes(req.userId),
            loadPriceList: () => storage.getPriceList(req.userId),
            loadRememberedMatches: () => storage.getRememberedMatches(req.userId),
          },
          ai,
          { supportsVision: deps.supportsVision, onImageSent: () => { sentImage = true; } },
        );
      } catch (err) {
        if (err instanceof InvalidAiJsonError) {
          return res.status(500).json({ message: "AI returned invalid JSON", raw: err.raw });
        }
        throw err;
      }
      const parsed = result.quote;

      // Keep the generation exactly as the phone receives it: the correction record
      // compares it with what the tradie finally sends. A failed write never costs
      // the quote; the response just goes without a generationId.
      const generationId = await captureGeneration(() => storage.createAiGeneration({
        userId: req.userId,
        draftKey: cleanDraftKey(req.body?.draftKey),
        input: generationInput(req.body),
        response: JSON.stringify(parsed),
        model: ai.model,
      }));
      if (generationId != null) parsed.generationId = generationId;

      res.json(parsed);
    } catch (error: any) {
      console.error("Quote generation error:", error);
      const msg: string = error?.message || "";
      // Only blame the image when one was actually sent AND the provider named an
      // image problem. A bare "400" match was wrongly classifying every provider
      // error (e.g. an unsupported parameter) as an unreadable photo, hiding the
      // real cause from us.
      const isImageError = sentImage && /image|invalid.*url|unsupported.*media/i.test(msg);
      res.status(isImageError ? 400 : 500).json({
        message: isImageError
          ? "The attached image couldn't be read — try a clearer photo or remove it and describe the job instead."
          : (msg || "Failed to generate quote"),
      });
    }
  };
}
