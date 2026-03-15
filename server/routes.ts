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

      const transcription = await openai.audio.transcriptions.create({
        file: fs.createReadStream(req.file.path),
        model: "gpt-4o-mini-transcribe",
      });

      // Clean up the uploaded file
      fs.unlinkSync(req.file.path);

      res.json({ text: transcription.text });
    } catch (error: any) {
      console.error("Transcription error:", error);
      res.status(500).json({ message: error?.message || "Failed to transcribe audio" });
    }
  });

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

      const tradeContext = tradeType && tradeType !== "general" ? `\nThe tradesperson is a ${tradeType}. Use pricing and terminology specific to this trade.` : "";

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
  "notes": "Professional notes covering: key assumptions made, what is NOT included (exclusions), site access requirements, and any warranties offered",
  "estimatedHours": 4,
  "totalLabour": 340.00,
  "totalMaterials": 250.00,
  "subtotal": 590.00,
  "gstAmount": 59.00,
  "totalAmount": 649.00
}

CRITICAL RULES — follow these exactly:
1. LINE ITEMS must be specific. BAD: "Labour". GOOD: "Labour – remove existing hot water unit, install new unit, connect copper pipework and test". BAD: "Materials". GOOD: "25mm copper half-union x2 @ $18 each".
2. ALWAYS break labour and materials into SEPARATE line items. Never bundle them.
3. LIST ORDER: call-out/travel first (if applicable), then labour items, then materials, then any permit or disposal fees.
4. QUANTITIES must be real numbers — if 3 fittings are needed, quantity is 3, unitPrice is cost per fitting.
5. NEVER under-quote. Australian tradies routinely lose money from thin margins. Include: travel/setup time, consumables (tape, sealant, fixings), waste disposal where applicable, and at least 15 minutes of post-job cleanup time.
6. USE REAL AUSTRALIAN PRICING: Apprentice labour $55–75/hr, Qualified tradesperson $85–120/hr, Specialist (sparky/gas fitter) $110–150/hr. Materials at trade price + markup.
7. NOTES section must include: what is NOT included (e.g. "Excludes wall patching or painting"), any assumptions (e.g. "Assumes existing wiring is to code"), and validity period.
8. jobTitle must be professional and specific — suitable to show a client on a formal document.${pricingInstructions}`;

      messages.push({ role: "system", content: systemPrompt });

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
        model: "gpt-5.1",
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
        res.status(400).json({ message: err.errors[0].message });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
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
      scheduledDate: new Date("2024-10-25T14:00:00Z"),
    });

    await storage.createJob({
      customerId: c2.id,
      title: "Install Ceiling Fan",
      description: "Master bedroom ceiling fan installation.",
      status: "pending",
      scheduledDate: new Date("2024-10-26T10:00:00Z"),
    });
  }
}
