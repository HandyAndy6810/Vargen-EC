import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Integration imports
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerImageRoutes } from "./replit_integrations/image";
import multer from "multer";
import fs from "fs";
import { buildAuthUrl, exchangeCodeForTokens, fetchTenants, getValidToken, upsertXeroContact, createXeroInvoice } from "./xero";
import { getTradeContext } from "./trade-knowledge";
import crypto from "crypto";
import { sendCustomerEmail } from "./lib/email";

const upload = multer({ dest: "uploads/" });

/** Fire-and-forget: sync a customer to Xero if the user has a connection. */
async function autoSyncCustomerToXero(userId: string, customerId: number) {
  try {
    const token = await getValidToken(userId);
    if (!token) return;
    const customer = await storage.getCustomer(customerId);
    if (!customer) return;
    const result = await upsertXeroContact(token.accessToken, token.tenantId, customer);
    if (result.contactId !== customer.xeroContactId) {
      await storage.updateCustomer(customerId, { xeroContactId: result.contactId });
    }
  } catch (err) {
    console.error("Auto Xero contact sync failed for customer", customerId, err);
  }
}

/** Fire-and-forget: create a Xero invoice from an accepted quote. */
async function autoCreateXeroInvoice(userId: string, quoteId: number) {
  try {
    const token = await getValidToken(userId);
    if (!token) return;

    const quote = await storage.getQuote(quoteId);
    if (!quote || quote.xeroInvoiceId) return;

    // Ensure customer is synced first
    let xeroContactId = quote.customerId
      ? (await storage.getCustomer(quote.customerId))?.xeroContactId
      : null;

    if (!xeroContactId && quote.customerId) {
      const syncResult = await syncCustomerToXero(token, quote.customerId);
      xeroContactId = syncResult?.contactId ?? null;
    }

    if (!xeroContactId) {
      console.error(`Auto Xero invoice skipped for quote ${quoteId}: customer has no Xero contact`);
      return;
    }

    const items = await storage.getQuoteItems(quoteId);
    const parsed = quote.content ? (() => { try { return JSON.parse(quote.content!); } catch { return null; } })() : null;
    const jobTitle = parsed?.jobTitle || `Quote #${quoteId}`;
    const includeGST = parsed?.includeGST ?? true;

    const lineItems = items.map((i) => ({
      description: i.description,
      quantity: i.quantity,
      unitPrice: parseFloat(String(i.price)),
    }));

    if (lineItems.length === 0) {
      lineItems.push({ description: jobTitle, quantity: 1, unitPrice: parseFloat(String(quote.totalAmount)) });
    }

    const result = await createXeroInvoice(token.accessToken, token.tenantId, {
      xeroContactId,
      quoteId,
      jobTitle,
      lineItems,
      includeGST,
    });

    await storage.updateQuote(quoteId, {
      xeroInvoiceId: result.invoiceId,
      xeroInvoiceNumber: result.invoiceNumber,
    });

    console.log(`Xero invoice ${result.invoiceNumber} created for quote ${quoteId}`);
  } catch (err) {
    console.error(`Auto Xero invoice creation failed for quote ${quoteId}:`, err);
  }
}

/** Helper to sync a customer to Xero and persist the contactId. */
async function syncCustomerToXero(
  token: { accessToken: string; tenantId: string },
  customerId: number
): Promise<{ contactId: string } | null> {
  const customer = await storage.getCustomer(customerId);
  if (!customer) return null;
  const result = await upsertXeroContact(token.accessToken, token.tenantId, customer);
  await storage.updateCustomer(customerId, { xeroContactId: result.contactId });
  return { contactId: result.contactId };
}

let openai: OpenAI;
try {
  openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
} catch (e) {
  console.warn("OpenAI client not initialized (AI features disabled):", (e as Error).message);
  openai = null as any;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // 1. Setup Auth (MUST be first)
  await setupAuth(app);
  registerAuthRoutes(app);

  // 2. Register Integration Routes
  registerChatRoutes(app);
  registerAudioRoutes(app);
  registerImageRoutes(app);

  // 3. Register Application Routes
  
  // Customers
  app.get(api.customers.list.path, async (req, res) => {
    const customers = await storage.getCustomers();
    res.json(customers);
  });

  app.get(api.customers.get.path, async (req, res) => {
    const customer = await storage.getCustomer(Number(req.params.id));
    if (!customer) return res.status(404).json({ message: "Customer not found" });
    res.json(customer);
  });

  app.post(api.customers.create.path, async (req, res) => {
    try {
      const input = api.customers.create.input.parse(req.body);
      const customer = await storage.createCustomer(input);
      const userId = (req as any).user?.claims?.sub;
      if (userId) autoSyncCustomerToXero(userId, customer.id);
      res.status(201).json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch(api.customers.update.path, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getCustomer(id);
      if (!existing) return res.status(404).json({ message: "Customer not found" });
      const input = api.customers.update.input.parse(req.body);
      const customer = await storage.updateCustomer(id, input);
      const userId = (req as any).user?.claims?.sub;
      if (userId) autoSyncCustomerToXero(userId, id);
      res.json(customer);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.delete(api.customers.delete.path, async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getCustomer(id);
      if (!existing) return res.status(404).json({ message: "Customer not found" });
      // Check for linked jobs
      const allJobs = await storage.getJobs();
      const linkedJobs = allJobs.filter(j => j.customerId === id);
      if (linkedJobs.length > 0) {
        return res.status(409).json({ message: `Customer has ${linkedJobs.length} linked job(s). Remove or reassign them first.` });
      }
      // Check for linked quotes
      const allQuotes = await storage.getQuotes();
      const linkedQuotes = allQuotes.filter(q => q.customerId === id);
      if (linkedQuotes.length > 0) {
        return res.status(409).json({ message: `Customer has ${linkedQuotes.length} linked quote(s). Remove or reassign them first.` });
      }
      await storage.deleteCustomer(id);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Jobs
  app.get(api.jobs.list.path, async (req, res) => {
    const jobs = await storage.getJobs();
    res.json(jobs);
  });

  app.get(api.jobs.get.path, async (req, res) => {
    const job = await storage.getJob(Number(req.params.id));
    if (!job) return res.status(404).json({ message: "Job not found" });
    res.json(job);
  });

  app.post(api.jobs.create.path, async (req, res) => {
    try {
      const input = api.jobs.create.input.parse(req.body);
      const job = await storage.createJob(input);
      res.status(201).json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  app.patch(api.jobs.update.path, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getJob(id);
      if (!existing) return res.status(404).json({ message: "Job not found" });
      const input = api.jobs.update.input.parse(req.body);
      const job = await storage.updateJob(id, input);
      res.json(job);
    } catch (err) {
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  // Quotes
  app.get(api.quotes.list.path, async (req, res) => {
    const quotes = await storage.getQuotes();
    res.json(quotes);
  });

  app.post(api.quotes.create.path, async (req, res) => {
    try {
      const input = api.quotes.create.input.parse(req.body);
      const quote = await storage.createQuote(input);
      res.status(201).json(quote);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  // Valid quote status transitions
  const QUOTE_TRANSITIONS: Record<string, string[]> = {
    draft:    ["sent"],
    sent:     ["accepted", "rejected", "declined", "draft"],
    viewed:   ["accepted", "rejected", "declined", "sent"],
    accepted: ["invoiced", "draft"],
    rejected: ["sent", "draft"],
    declined: ["sent", "draft"],
    invoiced: [],
  };

  app.patch(api.quotes.update.path, async (req: any, res) => {
    try {
      const quoteId = Number(req.params.id);
      const input = api.quotes.update.input.parse(req.body);
      const prevQuote = await storage.getQuote(quoteId);

      // Validate status transition
      if (input.status && prevQuote && input.status !== prevQuote.status) {
        const allowed = QUOTE_TRANSITIONS[prevQuote.status ?? "draft"] ?? [];
        if (!allowed.includes(input.status)) {
          return res.status(400).json({
            message: `Cannot change quote status from "${prevQuote.status}" to "${input.status}"`,
          });
        }
      }

      // Auto-generate shareToken, sentAt and followUpSchedule when status → "sent"
      if (input.status === "sent") {
        const existing = await storage.getQuote(quoteId);
        if (existing && !existing.shareToken) {
          (input as any).shareToken = crypto.randomUUID();
        }
        // Record the first time the quote is sent
        if (existing && !(existing as any).sentAt) {
          (input as any).sentAt = new Date();
        }
        // Auto-populate follow-up schedule from user settings
        if (existing && !existing.followUpSchedule) {
          try {
            const userId = req.user?.claims?.sub;
            if (userId) {
              const settings = await storage.getUserSettings(userId);
              if (settings?.followUpEnabled) {
                const days = JSON.parse(settings.followUpDays || "[3,7,14]");
                const schedule = days.map((day: number) => ({ day, status: "pending" }));
                (input as any).followUpSchedule = JSON.stringify(schedule);
              }
            }
          } catch { /* non-critical */ }
        }
      }

      const quote = await storage.updateQuote(quoteId, input);
      res.json(quote);

      // Auto-create Xero invoice when a quote is first accepted
      const userId = req.user?.claims?.sub;
      const justAccepted = input.status === "accepted" && prevQuote?.status !== "accepted";
      if (userId && justAccepted && !quote.xeroInvoiceId) {
        autoCreateXeroInvoice(userId, quoteId).catch((err) =>
          console.error("Auto Xero invoice creation failed for quote", quoteId, err)
        );
      }
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.get("/api/quotes/:id", async (req, res) => {
    const quote = await storage.getQuote(Number(req.params.id));
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    res.json(quote);
  });

  // Quote Items
  app.get("/api/quotes/:quoteId/items", async (req, res) => {
    const items = await storage.getQuoteItems(Number(req.params.quoteId));
    res.json(items);
  });

  app.post("/api/quotes/:quoteId/items", async (req, res) => {
    try {
      const item = await storage.createQuoteItem({
        quoteId: Number(req.params.quoteId),
        description: req.body.description,
        quantity: Number(req.body.quantity),
        price: String(req.body.price),
      });
      res.status(201).json(item);
    } catch (err) {
      res.status(400).json({ message: "Validation error" });
    }
  });

  app.delete("/api/quotes/items/:id", async (req, res) => {
    await storage.deleteQuoteItem(Number(req.params.id));
    res.json({ ok: true });
  });

  app.delete(api.quotes.delete.path, async (req, res) => {
    try {
      const quote = await storage.getQuote(Number(req.params.id));
      if (!quote) return res.status(404).json({ message: "Quote not found" });
      await storage.deleteQuote(Number(req.params.id));
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ message: "Failed to delete quote" });
    }
  });

  app.post("/api/audio/transcribe", upload.single("audio"), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No audio file provided" });
      }

      const filePath = req.file.path;
      let transcription;
      try {
        transcription = await openai.audio.transcriptions.create({
          file: fs.createReadStream(filePath),
          model: "gpt-4o-mini-transcribe",
        });
      } finally {
        // Always clean up the uploaded file, even on error
        try { fs.unlinkSync(filePath); } catch (_) {}
      }

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ message: error?.message || "Failed to transcribe audio" });
    }
  });

  // Trade-specific knowledge is now in server/trade-knowledge.ts

  // AI Quote Generation
  app.post("/api/quotes/generate", async (req, res) => {
    try {
      const { description, imageBase64, customerName, tradeType, labourRate, markupPercent, callOutFee, includeGST, targetPrice } = req.body;

      if (!description || typeof description !== "string") {
        return res.status(400).json({ message: "Job description is required" });
      }

      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [];

      const labourRateNum = typeof labourRate === "number" && labourRate > 0 ? labourRate : null;
      const markupNum = typeof markupPercent === "number" ? markupPercent : 0;
      const callOutNum = typeof callOutFee === "number" && callOutFee > 0 ? callOutFee : 0;
      const gstEnabled = includeGST === true;

      let pricingInstructions = "";
      if (labourRateNum) {
        pricingInstructions += `\n- Use a labour rate of $${labourRateNum}/hour for all labour items`;
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

      const tradeContext = tradeType && tradeType !== "general" ? `\nThe tradesperson is a ${tradeType}. Use pricing, terminology, units of measure, and compliance requirements specific to this trade.` : "";
      const tradeKnowledge = getTradeContext(tradeType || "general");

      const systemPrompt = `You are a senior Australian trade contractor with 15+ years of experience writing detailed, professional quotes. Your quotes win jobs because they are specific, thorough, and priced correctly for the Australian market.${tradeContext}

You MUST respond with valid JSON in this exact format:
{
  "jobTitle": "Concise, professional job title (e.g. 'Hot Water System Replacement' not 'plumbing job')",
  "summary": "2-3 sentence professional summary of the scope of work, written for the client",
  "items": [
    {
      "description": "Specific item description — ALWAYS include size, spec, brand tier (e.g. '25mm copper elbow fitting x4', 'Rinnai B16 continuous flow HWS 16L/min', 'Labour – hot water system removal and install')",
      "quantity": 1,
      "unit": "each|hr|sqm|lm|lot",
      "unitPrice": 85.00
    }
  ],
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
11. CONSISTENCY: Ensure line item descriptions and the notes/exclusions section do not contradict each other. If an item is included as a line item, do NOT exclude it in the notes. If something is genuinely excluded, it must not appear as a line item.${pricingInstructions}`;

      messages.push({ role: "system", content: systemPrompt });

      // Learn from past quotes — inject recent accepted/sent quotes as few-shot examples
      try {
        const allQuotes = await storage.getQuotes();
        const pastQuotes = allQuotes
          .filter(q => q.content && (q.status === "accepted" || q.status === "sent"))
          .slice(0, 5); // up to 5 most recent successful quotes

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

      if (imageBase64) {
        userContent.push({
          type: "image_url",
          image_url: {
            url: imageBase64.startsWith("data:") ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`,
            detail: "high",
          },
        });
      }

      messages.push({ role: "user", content: userContent });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages,
        max_completion_tokens: 4096,
        response_format: { type: "json_object" },
      });

      const raw = response.choices[0]?.message?.content || "{}";
      let parsed;
      try {
        parsed = JSON.parse(raw);
      } catch {
        return res.status(500).json({ message: "AI returned invalid JSON", raw });
      }

      // Post-generation filter: strip call-out/travel items when no call-out fee was requested
      if (callOutNum === 0 && Array.isArray(parsed.items)) {
        const callOutPattern = /call.?out|site.?visit|travel.?fee|call.?in|mobilisation/i;
        parsed.items = parsed.items.filter((item: any) => !callOutPattern.test(item.description || ""));
        // Recalculate totals after filtering
        if (parsed.items.length > 0) {
          const subtotal = parsed.items.reduce((sum: number, item: any) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
          parsed.subtotal = Math.round(subtotal * 100) / 100;
          parsed.gstAmount = gstEnabled ? Math.round(subtotal * 0.1 * 100) / 100 : 0;
          parsed.totalAmount = Math.round((parsed.subtotal + parsed.gstAmount) * 100) / 100;
        }
      }

      res.json(parsed);
    } catch (error: any) {
      console.error("Quote generation error:", error);
      res.status(500).json({ message: error?.message || "Failed to generate quote" });
    }
  });

  // Clear All Data
  app.delete("/api/data/clear-all", async (req: any, res) => {
    try {
      const { db } = await import("./db");
      const { customers, jobs, quotes, quoteItems, invoices, jobTimerEntries } = await import("../shared/schema");

      await db.delete(jobTimerEntries);
      await db.delete(quoteItems);
      await db.delete(invoices);
      await db.delete(quotes);
      await db.delete(jobs);
      await db.delete(customers);

      res.json({ ok: true });
    } catch (err: any) {
      console.error("Clear all data error:", err);
      res.status(500).json({ message: err.message || "Failed to clear data" });
    }
  });

  // User Settings
  app.get(api.settings.get.path, async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const settings = await storage.getUserSettings(userId);
    res.json(settings ?? null);
  });

  app.patch(api.settings.update.path, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const input = api.settings.update.input.parse(req.body);
      const settings = await storage.upsertUserSettings(userId, input);
      res.json(settings);
    } catch (err) {
      if (err instanceof z.ZodError) {
        console.error("Settings validation error:", err.errors);
        res.status(400).json({ message: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
      } else {
        console.error("Settings save error:", err);
        const msg = err instanceof Error ? err.message : "Internal server error";
        res.status(500).json({ message: msg });
      }
    }
  });

  // ─── Job Timer Routes ───

  app.get(api.timers.active.path, async (req: any, res) => {
    try {
      const entry = await storage.getActiveTimer();
      res.json(entry ?? null);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to get active timer" });
    }
  });

  app.get(api.timers.listForJob.path, async (req: any, res) => {
    try {
      const jobId = Number(req.params.jobId);
      const entries = await storage.getTimerEntries(jobId);
      res.json(entries);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to get timer entries" });
    }
  });

  app.post(api.timers.start.path, async (req: any, res) => {
    try {
      const { jobId } = api.timers.start.input.parse(req.body);
      const active = await storage.getActiveTimer();
      if (active) {
        return res.status(409).json({ message: "A timer is already running. Stop it first." });
      }
      const entry = await storage.createTimerEntry({ jobId, startTime: new Date() });
      res.status(201).json(entry);
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      res.status(500).json({ message: err?.message || "Failed to start timer" });
    }
  });

  app.post("/api/timers/:id/stop", async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const { notes } = req.body || {};
      const endTime = new Date();
      const entries = await storage.getTimerEntries(0);
      const active = await storage.getActiveTimer();
      if (!active || active.id !== id) {
        return res.status(404).json({ message: "Timer not found or already stopped" });
      }
      const duration = Math.round((endTime.getTime() - new Date(active.startTime).getTime()) / 1000);
      const updated = await storage.updateTimerEntry(id, { endTime, duration, notes: notes || null });
      res.json(updated);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to stop timer" });
    }
  });

  app.delete("/api/timers/:id", async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      await storage.deleteTimerEntry(id);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to delete timer entry" });
    }
  });

  // ─── Portal Routes (Public — no auth) ───

  app.get("/api/portal/:token", async (req, res) => {
    try {
      const { token } = req.params;
      const quote = await storage.getQuoteByShareToken(token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const items = await storage.getQuoteItems(quote.id);
      let customer = null;
      if (quote.customerId) {
        customer = await storage.getCustomer(quote.customerId) || null;
      }

      const feedback = await storage.getPortalFeedback(quote.id);

      // Fetch business details from user settings
      const s = await storage.getAnyUserSettings();
      const businessName = s?.businessName || "";
      const businessPhone = s?.phone || "";
      const businessEmail = s?.email || "";
      const businessAddress = s?.address || "";

      res.json({
        quote,
        customer,
        items,
        feedback,
        businessName,
        businessPhone,
        businessEmail,
        businessAddress,
      });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to load portal" });
    }
  });

  app.post("/api/portal/:token/accept", async (req, res) => {
    try {
      const { token } = req.params;
      const quote = await storage.getQuoteByShareToken(token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const { preferredDate } = req.body;
      const updates: any = { status: "accepted" };
      if (preferredDate && typeof preferredDate === "string") {
        const existing = quote.content ? (() => { try { return JSON.parse(quote.content); } catch { return {}; } })() : {};
        updates.content = JSON.stringify({ ...existing, preferredDate });
      }
      await storage.updateQuote(quote.id, updates);
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to accept quote" });
    }
  });

  app.post("/api/portal/:token/decline", async (req, res) => {
    try {
      const { token } = req.params;
      const quote = await storage.getQuoteByShareToken(token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      await storage.updateQuote(quote.id, { status: "rejected" });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to decline quote" });
    }
  });

  app.post("/api/portal/:token/feedback", async (req, res) => {
    try {
      const { token } = req.params;
      const quote = await storage.getQuoteByShareToken(token);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const { message } = req.body;
      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      const feedback = await storage.createPortalFeedback({ quoteId: quote.id, message });
      res.status(201).json(feedback);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to save feedback" });
    }
  });

  // ─── Invoice Routes ───

  app.get(api.invoices.list.path, async (req: any, res) => {
    try {
      const allInvoices = await storage.getInvoices();
      res.json(allInvoices);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to get invoices" });
    }
  });

  app.get("/api/invoices/:id", async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const invoice = await storage.getInvoice(id);
      if (!invoice) return res.status(404).json({ message: "Invoice not found" });
      res.json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to get invoice" });
    }
  });

  app.post("/api/invoices/from-quote/:quoteId", async (req: any, res) => {
    try {
      const quoteId = Number(req.params.quoteId);
      const quote = await storage.getQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const existing = await storage.getInvoiceByQuoteId(quoteId);
      if (existing) return res.status(409).json({ message: "Invoice already exists for this quote" });

      let items: any[] = [];
      let subtotal = 0;
      let gstAmount = 0;
      let notes = "";
      try {
        const content = JSON.parse(quote.content || "{}");
        items = (content.items || []).map((item: any) => ({
          description: item.description,
          quantity: item.quantity,
          unit: item.unit || "each",
          unitPrice: item.unitPrice,
          total: (item.quantity || 1) * (item.unitPrice || 0),
        }));
        subtotal = content.subtotal || Number(quote.totalAmount) || 0;
        gstAmount = content.gstAmount || 0;
        notes = content.notes || "";
      } catch {
        subtotal = Number(quote.totalAmount) || 0;
      }

      const userId = req.user?.claims?.sub;
      let paymentTermsDays = 14;
      if (userId) {
        const settings = await storage.getUserSettings(userId);
        if (settings?.paymentTermsDays) paymentTermsDays = settings.paymentTermsDays;
      }

      const invoiceNumber = await storage.getNextInvoiceNumber();
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + paymentTermsDays);

      const invoice = await storage.createInvoice({
        quoteId: quote.id,
        customerId: quote.customerId,
        invoiceNumber,
        status: "draft",
        items: JSON.stringify(items),
        subtotal: String(subtotal),
        gstAmount: String(gstAmount),
        totalAmount: String(Number(subtotal) + Number(gstAmount)),
        dueDate,
        notes,
      });

      // Mark the originating quote as invoiced
      await storage.updateQuote(quoteId, { status: "invoiced" });

      res.status(201).json(invoice);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to create invoice" });
    }
  });

  app.patch("/api/invoices/:id", async (req: any, res) => {
    try {
      const id = Number(req.params.id);
      const existing = await storage.getInvoice(id);
      if (!existing) return res.status(404).json({ message: "Invoice not found" });

      const updated = await storage.updateInvoice(id, req.body);
      res.json(updated);

      // Send email when invoice is first marked as sent
      const justSent = req.body.status === "sent" && existing.status !== "sent";
      if (justSent && existing.customerId) {
        const customer = await storage.getCustomer(existing.customerId);
        if (customer?.email) {
          const s = await storage.getAnyUserSettings();
          const businessName = s?.businessName || "Your Tradie";
          const dueDate = updated.dueDate
            ? new Date(updated.dueDate).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" })
            : null;
          sendCustomerEmail(
            customer.email,
            `Invoice ${existing.invoiceNumber} from ${businessName}`,
            `Hi ${customer.name},\n\nYour invoice is ready.\n\nInvoice Number: ${existing.invoiceNumber}\nAmount Due: $${Number(updated.totalAmount).toFixed(2)}${dueDate ? `\nDue Date: ${dueDate}` : ""}\n\nPlease contact us if you have any questions.\n\nKind regards,\n${businessName}`
          ).catch((err: Error) => console.error("Invoice email failed:", err));
        }
      }
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to update invoice" });
    }
  });

  // ─── Follow-Up Routes ───

  app.get(api.followUps.due.path, async (req: any, res) => {
    try {
      const allQuotes = await storage.getQuotes();
      const dueFollowUps: any[] = [];

      for (const quote of allQuotes) {
        if (quote.status !== "sent" || !quote.followUpSchedule) continue;
        try {
          const schedule = JSON.parse(quote.followUpSchedule);
          const sentDate = (quote as any).sentAt || quote.createdAt;
          const daysSinceSent = Math.floor(
            (Date.now() - new Date(sentDate!).getTime()) / (1000 * 60 * 60 * 24)
          );
          for (let i = 0; i < schedule.length; i++) {
            if (schedule[i].status === "pending" && daysSinceSent >= schedule[i].day) {
              dueFollowUps.push({ quote, dueIndex: i, dayNumber: schedule[i].day });
              break;
            }
          }
        } catch { /* skip malformed schedule */ }
      }

      res.json(dueFollowUps);
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to get follow-ups" });
    }
  });

  app.post("/api/follow-ups/:quoteId/mark-sent", async (req: any, res) => {
    try {
      const quoteId = Number(req.params.quoteId);
      const { dayIndex } = req.body;
      const quote = await storage.getQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const schedule = JSON.parse(quote.followUpSchedule || "[]");
      if (schedule[dayIndex]) {
        schedule[dayIndex].status = "sent";
        schedule[dayIndex].sentAt = new Date().toISOString();
      }
      await storage.updateQuote(quoteId, { followUpSchedule: JSON.stringify(schedule) });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to mark follow-up sent" });
    }
  });

  app.post("/api/follow-ups/:quoteId/skip", async (req: any, res) => {
    try {
      const quoteId = Number(req.params.quoteId);
      const { dayIndex } = req.body;
      const quote = await storage.getQuote(quoteId);
      if (!quote) return res.status(404).json({ message: "Quote not found" });

      const schedule = JSON.parse(quote.followUpSchedule || "[]");
      if (schedule[dayIndex]) {
        schedule[dayIndex].status = "skipped";
      }
      await storage.updateQuote(quoteId, { followUpSchedule: JSON.stringify(schedule) });
      res.json({ ok: true });
    } catch (error: any) {
      res.status(500).json({ message: error?.message || "Failed to skip follow-up" });
    }
  });

  // ─── Customer Email ───

  app.post("/api/messages/email", async (req: any, res) => {
    try {
      const { to, subject, body } = req.body || {};
      if (!to || !subject || !body) {
        return res.status(400).json({ message: "to, subject and body are required" });
      }
      await sendCustomerEmail(to, subject, body);
      res.json({ ok: true });
    } catch (error: any) {
      console.error("Send email error:", error);
      res.status(500).json({ message: error?.message || "Failed to send email" });
    }
  });

  // ─── Job Templates ───

  app.get("/api/templates", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const templates = await storage.getJobTemplates(userId);
    res.json(templates);
  });

  app.post("/api/templates", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const { label, icon, description } = req.body;
      if (!label || typeof label !== "string") {
        return res.status(400).json({ message: "Label is required" });
      }
      const template = await storage.createJobTemplate({
        userId,
        label,
        icon: icon || "📋",
        description: description || "",
      });
      res.status(201).json(template);
    } catch (err) {
      res.status(500).json({ message: "Failed to create template" });
    }
  });

  app.delete("/api/templates/:id", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await storage.deleteJobTemplate(Number(req.params.id), userId);
    res.json({ ok: true });
  });

  // ─── Recent Activity ───

  app.get("/api/activity", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const activities = await storage.getRecentActivity(20);
      res.json(activities);
    } catch (err) {
      console.error("Activity fetch error:", err);
      res.status(500).json({ message: "Failed to fetch activity" });
    }
  });

  // ─── Frequent Job Types ───

  app.get("/api/templates/frequent", async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });
      const allQuotes = await storage.getQuotes();
      const counts: Record<string, { count: number; icon: string }> = {};
      allQuotes.forEach(q => {
        try {
          const parsed = JSON.parse(q.content || "{}");
          const title = parsed.jobTitle || parsed.title;
          if (title) {
            if (!counts[title]) counts[title] = { count: 0, icon: "📋" };
            counts[title].count++;
          }
        } catch {}
      });

      const frequent = Object.entries(counts)
        .sort((a, b) => b[1].count - a[1].count)
        .slice(0, 6)
        .map(([label, data]) => {
          let icon = "📋";
          const l = label.toLowerCase();
          if (l.includes("bath")) icon = "🚿";
          else if (l.includes("deck")) icon = "🪵";
          else if (l.includes("switch") || l.includes("electric")) icon = "⚡";
          else if (l.includes("light") || l.includes("downlight")) icon = "💡";
          else if (l.includes("plumb") || l.includes("leak") || l.includes("faucet")) icon = "🚰";
          else if (l.includes("roof")) icon = "🏠";
          else if (l.includes("paint")) icon = "🎨";
          else if (l.includes("fence")) icon = "🪵";
          else if (l.includes("air") || l.includes("hvac")) icon = "❄️";
          return { label, icon, count: data.count };
        });

      res.json(frequent);
    } catch (err) {
      res.status(500).json({ message: "Failed to fetch frequent templates" });
    }
  });

  // ─── Xero OAuth2 PKCE Routes ───

  app.get("/api/xero/connect", (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      (req.session as any).returnTo = "/api/xero/connect";
      return req.session.save(() => {
        res.redirect("/api/login");
      });
    }

    // Pre-flight: check env vars are configured before starting OAuth
    if (!process.env.XERO_CLIENT_ID || !process.env.XERO_REDIRECT_URI) {
      console.error("Xero connect attempted but XERO_CLIENT_ID or XERO_REDIRECT_URI is not set");
      return res.redirect("/profile?xero=error&reason=not_configured");
    }

    try {
      const { url, codeVerifier, state } = buildAuthUrl();
      (req.session as any).xeroCodeVerifier = codeVerifier;
      (req.session as any).xeroState = state;
      req.session.save(() => {
        res.redirect(url);
      });
    } catch (err: any) {
      console.error("Xero connect error:", err);
      res.redirect("/profile?xero=error&reason=server_error");
    }
  });

  // OAuth callback — Xero redirects here with ?code=...&state=...
  app.get("/api/xero/callback", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.redirect("/profile?xero=error&reason=unauthorized");

    const { code, state } = req.query;
    const savedVerifier = (req.session as any).xeroCodeVerifier;
    const savedState = (req.session as any).xeroState;

    // Clean up session
    delete (req.session as any).xeroCodeVerifier;
    delete (req.session as any).xeroState;

    if (!code || !savedVerifier) {
      return res.redirect("/profile?xero=error&reason=missing_code");
    }
    if (state !== savedState) {
      return res.redirect("/profile?xero=error&reason=invalid_state");
    }

    try {
      // Exchange code for tokens
      const tokens = await exchangeCodeForTokens(code as string, savedVerifier);

      // Fetch connected tenants
      const tenants = await fetchTenants(tokens.accessToken);
      if (tenants.length === 0) {
        return res.redirect("/profile?xero=error&reason=no_tenants");
      }

      // Store tokens (use first tenant)
      const tenant = tenants[0];
      const expiresAt = new Date(Date.now() + tokens.expiresIn * 1000);

      await storage.upsertXeroToken(userId, {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt,
        tenantId: tenant.tenantId,
        tenantName: tenant.tenantName,
      });

      res.redirect("/profile?xero=success");
    } catch (err: any) {
      console.error("Xero callback error:", err);
      res.redirect("/profile?xero=error&reason=token_exchange");
    }
  });

  // Check connection status
  app.get("/api/xero/status", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const token = await storage.getXeroToken(userId);
    if (!token) {
      return res.json({ connected: false });
    }

    // Check if token can be refreshed
    const valid = await getValidToken(userId);
    if (!valid) {
      return res.json({ connected: false });
    }

    res.json({
      connected: true,
      tenantName: token.tenantName || "Xero Organisation",
      connectedAt: token.createdAt,
    });
  });

  // Disconnect from Xero
  app.post("/api/xero/disconnect", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    await storage.deleteXeroToken(userId);
    res.json({ ok: true });
  });

  // ─── Xero Sync Routes ────────────────────────────────────────────────────

  // Manually sync a single customer to Xero contacts
  app.post("/api/xero/sync-customer/:id", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const token = await getValidToken(userId);
    if (!token) return res.status(400).json({ message: "Xero not connected" });

    const customerId = Number(req.params.id);
    const customer = await storage.getCustomer(customerId);
    if (!customer) return res.status(404).json({ message: "Customer not found" });

    try {
      const result = await upsertXeroContact(token.accessToken, token.tenantId, customer);
      await storage.updateCustomer(customerId, { xeroContactId: result.contactId });
      res.json({ ok: true, contactId: result.contactId, name: result.name });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to sync contact" });
    }
  });

  // Sync ALL customers to Xero contacts
  app.post("/api/xero/sync-all-customers", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const token = await getValidToken(userId);
    if (!token) return res.status(400).json({ message: "Xero not connected" });

    const customers = await storage.getCustomers();
    let synced = 0;
    let failed = 0;
    for (const customer of customers) {
      try {
        const result = await upsertXeroContact(token.accessToken, token.tenantId, customer);
        await storage.updateCustomer(customer.id, { xeroContactId: result.contactId });
        synced++;
      } catch (err) {
        console.error("Sync failed for customer", customer.id, err);
        failed++;
      }
    }
    res.json({ ok: true, synced, failed, total: customers.length });
  });

  // Manually create a Xero invoice from an accepted quote
  app.post("/api/xero/invoice/:quoteId", async (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const token = await getValidToken(userId);
    if (!token) return res.status(400).json({ message: "Xero not connected" });

    const quoteId = Number(req.params.quoteId);
    const quote = await storage.getQuote(quoteId);
    if (!quote) return res.status(404).json({ message: "Quote not found" });
    if (quote.status !== "accepted") return res.status(400).json({ message: "Only accepted quotes can be invoiced" });
    if (quote.xeroInvoiceId) return res.json({ ok: true, invoiceId: quote.xeroInvoiceId, invoiceNumber: quote.xeroInvoiceNumber, alreadyExists: true });

    try {
      // Ensure customer has a Xero contact
      let xeroContactId = quote.customerId
        ? (await storage.getCustomer(quote.customerId))?.xeroContactId
        : null;
      if (!xeroContactId && quote.customerId) {
        const syncResult = await syncCustomerToXero(token, quote.customerId);
        xeroContactId = syncResult?.contactId ?? null;
      }
      if (!xeroContactId) return res.status(400).json({ message: "Customer must be synced to Xero first" });

      const items = await storage.getQuoteItems(quoteId);
      const parsed = quote.content ? (() => { try { return JSON.parse(quote.content!); } catch { return null; } })() : null;
      const jobTitle = parsed?.jobTitle || `Quote #`;
      const includeGST = parsed?.includeGST ?? true;

      const lineItems = items.map((i) => ({
        description: i.description,
        quantity: i.quantity,
        unitPrice: parseFloat(String(i.price)),
      }));
      if (lineItems.length === 0) {
        lineItems.push({ description: jobTitle, quantity: 1, unitPrice: parseFloat(String(quote.totalAmount)) });
      }

      const result = await createXeroInvoice(token.accessToken, token.tenantId, {
        xeroContactId,
        quoteId,
        jobTitle,
        lineItems,
        includeGST,
      });

      await storage.updateQuote(quoteId, {
        xeroInvoiceId: result.invoiceId,
        xeroInvoiceNumber: result.invoiceNumber,
      });

      res.json({ ok: true, invoiceId: result.invoiceId, invoiceNumber: result.invoiceNumber });
    } catch (err: any) {
      res.status(500).json({ message: err.message || "Failed to create invoice" });
    }
  });

  return httpServer;
}

async function seedDatabase() {
  const existingCustomers = await storage.getCustomers();
  if (existingCustomers.length === 0) {
    const c1 = await storage.createCustomer({
      name: "Alice Smith",
      email: "alice@example.com",
      phone: "555-0101",
      address: "123 Maple St",
    });
    const c2 = await storage.createCustomer({
      name: "Bob Jones",
      email: "bob@example.com",
      phone: "555-0102",
      address: "456 Oak Ave",
    });

    await storage.createJob({
      customerId: c1.id,
      title: "Fix Leaky Faucet",
      description: "Kitchen sink faucet is dripping continuously.",
      status: "scheduled",
      scheduledDate: new Date("2026-04-15T14:00:00Z"),
    });

    await storage.createJob({
      customerId: c2.id,
      title: "Install Ceiling Fan",
      description: "Master bedroom ceiling fan installation.",
      status: "pending",
      scheduledDate: new Date("2026-04-16T10:00:00Z"),
    });
  }
}
