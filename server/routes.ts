import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Integration imports
import { setupAuth, registerAuthRoutes } from "./replit_integrations/auth";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAudioRoutes } from "./replit_integrations/audio";
import { registerImageRoutes } from "./replit_integrations/image";
import multer from "multer";
import fs from "fs";
import { buildAuthUrl, exchangeCodeForTokens, fetchTenants, getValidToken } from "./xero";
import { getTradeContext } from "./trade-knowledge";

const upload = multer({ dest: "uploads/" });

const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

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
      const input = api.jobs.update.input.parse(req.body);
      const job = await storage.updateJob(Number(req.params.id), input);
      res.json(job);
    } catch (err) {
       res.status(400).json({ message: "Validation error" });
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

  app.patch(api.quotes.update.path, async (req, res) => {
    try {
      const input = api.quotes.update.input.parse(req.body);
      const quote = await storage.updateQuote(Number(req.params.id), input);
      res.json(quote);
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
      const { description, imageBase64, customerName, tradeType, labourRate, markupPercent, callOutFee, includeGST } = req.body;

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
      }
      if (gstEnabled) {
        pricingInstructions += `\n- Add 10% GST to the total. Include a "gstAmount" field in your response with the GST dollar amount. The "totalAmount" should be the GST-inclusive total`;
      } else {
        pricingInstructions += `\n- All prices are GST-exclusive. Mention "All prices exclude GST" in the notes`;
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
3. LIST ORDER: call-out/travel first (if applicable), then labour items, then materials, then any permit or disposal fees.
4. QUANTITIES must be real numbers — if 3 fittings are needed, quantity is 3, unitPrice is cost per fitting.
5. NEVER under-quote. Australian tradies routinely lose money from thin margins. Include: travel/setup time, consumables (tape, sealant, fixings), waste disposal where applicable, and at least 15 minutes of post-job cleanup time.
6. USE THE TRADE KNOWLEDGE BASE: All pricing must align with the reference data above. Use the estimation formulas provided to calculate quantities. Apply the correct units of measure for this trade.
7. NOTES section must include: what is NOT included (exclusions), assumptions made, relevant compliance requirements from the knowledge base, and quote validity period (14 days).
8. jobTitle must be professional and specific — suitable to show a client on a formal document.
9. CROSS-CHECK every price against the pricing reference before finalising. If a material or labour rate differs by more than 20% from the reference ranges, adjust it — unless the job description specifically calls for a premium brand, remote location, or unusual circumstance.
10. CHECK THE GOTCHAS: Review the trade-specific gotchas section and ensure your quote accounts for commonly missed items (e.g. disposal fees, compliance certificates, consumables allowance).${pricingInstructions}`;

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

      res.json(parsed);
    } catch (error: any) {
      console.error("Quote generation error:", error);
      res.status(500).json({ message: error?.message || "Failed to generate quote" });
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

  // ─── Xero OAuth2 PKCE Routes ───

  app.get("/api/xero/connect", (req: any, res) => {
    const userId = req.user?.claims?.sub;
    if (!userId) {
      (req.session as any).returnTo = "/api/xero/connect";
      return req.session.save(() => {
        res.redirect("/api/login");
      });
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
      res.status(500).json({ message: err.message || "Failed to start Xero connection" });
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

  // Seed data function
  await seedDatabase();

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
