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

  // Trade-specific pricing reference tables (2025 Australian market rates)
  function getTradeReferencePricing(tradeType: string): string {
    const t = (tradeType || "").toLowerCase();

    if (t.includes("plumb")) return `
Labour: Licensed plumber $100–130/hr; Apprentice $60–80/hr
Materials (trade price):
- 20mm copper pipe $12–18/m; 25mm $18–28/m; copper elbow/tee fitting $10–22 each; compression fitting $18–35
- Brass ball valve 20mm $35–60; 25mm $50–80
- Rheem 315L electric HWS $1,100–1,450; Rinnai B16 continuous flow HWS $950–1,200
- Basin mixer tap (mid-range) $150–350; kitchen sink mixer $180–450; shower mixer valve $200–550
- Toilet suite $280–650; 600mm flexible hose $18–30 each; tap washers/O-rings (lot) $5–15
- Push-fit 20mm coupling $8–18; teflon tape/thread sealant (lot) $5–12
Sanity checks: Tap replacement all-in $200–400; HWS replacement $1,800–3,500; toilet install $350–700; shower install $800–2,500`;

    if (t.includes("electr")) return `
Labour: Licensed electrician $115–145/hr
Materials (trade price):
- 2.5mm twin & earth cable $3.50–5.50/m; 1.5mm T&E $2–3.50/m; 6mm T&E $8–14/m; 4mm T&E $5–9/m
- Double GPO $45–75; single GPO $30–50; weatherproof GPO $60–100; USB GPO $70–120
- LED downlight 10W $30–65; oyster ceiling light $40–90; exhaust fan $60–150
- Safety switch (RCD) 10A $90–150; MCB single pole $28–50; RCBO $80–140
- Switchboard 6-circuit (trade) $400–700; conduit 25mm per m $4–8
- Cable clips per 100 $12–25; junction box $12–30; back box $8–20
Sanity checks: New power point $250–450; LED downlight $180–350 each installed; safety switch $300–500; ceiling fan $350–650 installed; switchboard upgrade $1,500–4,000`;

    if (t.includes("carp") || t.includes("build")) return `
Labour: Carpenter/builder $80–115/hr
Materials (trade price):
- Structural pine 90×45 MGP10 $5–9/m; 190×45 $12–18/m; 240×45 $16–24/m
- F17 hardwood 90×45 $12–20/m; LVL beam 150×45 $22–35/m
- Plywood 12mm CD $65–90/sheet (2400×1200); 19mm $90–125/sheet; 7mm $45–65/sheet
- Decking pine 90×19 $8–14/m; hardwood decking 90×19 $12–22/m
- Treated pine sleeper 200×75 $20–32/m; 200×50 $14–24/m
- Joist hanger $8–18 each; framing nails 90mm per kg $8–15; hex head screws 75mm per 500 $25–45
Sanity checks: Timber deck 20sqm $8,000–18,000; pergola 4×4m $4,000–12,000; garden shed framing $2,500–6,000; fence per m $150–400`;

    if (t.includes("paint")) return `
Labour: Painter interior $50–70/hr (or $20–45/sqm supply & paint 2 coats); exterior $60–80/hr
Materials (trade price):
- Dulux Wash & Wear interior 15L $160–210; Dulux exterior 15L $180–240
- Taubmans All Weather 10L $120–165; Solver interior 10L $90–140
- Primer/sealer 10L $80–130; sugar soap 5L $35–60; sandpaper assorted (lot) $20–45
- 9" roller frame + cover $25–50; paint tray $10–20; 75mm brush $15–30
- Masking tape 48mm $8–15/roll; drop sheet canvas $30–80; painter's plastic per roll $15–35
- Coverage: 1L per 10–12sqm per coat; always 2 coats minimum
Sanity checks: Single bedroom $600–1,200; full interior 3-bed $4,500–10,000; exterior 3-bed $6,000–15,000; single door $150–350`;

    if (t.includes("tile") || t.includes("tiler")) return `
Labour: Tiler floor $60–95/sqm (supply & lay); wall tiles $70–110/sqm; waterproofing $25–45/sqm
Materials (trade price):
- Standard floor tile 600×600 (trade) $35–80/sqm; wall tile 300×600 $30–70/sqm; feature tile $60–150/sqm
- Ardex X7 adhesive 20kg $55–80; Mapei Keraflex 20kg $50–75; white adhesive 20kg $45–65
- Grout sanded 2kg $22–40; grout unsanded 2kg $20–35; epoxy grout 2kg $55–90
- Waterproof membrane 10L $80–130; fibreglass tape 50m $15–30
- Flexible silicone sealant tube $15–30; tile spacers 3mm per 500 $10–20; tile trim per m $8–18
Sanity checks: Bathroom floor retile 10sqm $900–1,800; shower regrouting $400–800; kitchen splashback $500–1,200; bathroom waterproofing $600–1,200`;

    if (t.includes("landscape") || t.includes("garden")) return `
Labour: Landscaper/gardener $60–85/hr
Materials (trade price):
- Garden/topsoil per m³ delivered $90–150; premium compost per m³ $100–170
- Hardwood mulch per m³ delivered $75–120; pine bark per m³ $65–100
- Ready-mix concrete per m³ delivered 20MPa $200–300; 25MPa $220–330
- Instant turf per m² supply $15–28; turf laying per m² (labour) $8–18
- Concrete paver 400×400mm $8–18 each; 600×600mm $15–30 each; brick paver $2–5 each
- Retaining wall block 200×400×200mm $10–22 each; concrete sleeper 200×75×2000mm $80–180
- Garden edging steel 1.5mm per m $15–30; irrigation drip line per m $2–5; poly pipe 13mm per m $1–3
Sanity checks: Lawn laying 100sqm $2,500–5,000; retaining wall per m² $400–900; concrete path per m² $120–250; garden bed prep per m² $40–100`;

    if (t.includes("roof")) return `
Labour: Roofer $60–90/hr
Materials (trade price):
- Colorbond® roofing sheet 0.42 BMT $18–30/lm; 0.48 BMT $24–38/lm
- Ridge capping Colorbond $15–25/lm; barge capping $12–22/lm; valley flashing $15–28/lm
- Roofing screws hex head 65mm (500pk) $45–80; foam closure strips per m $3–8
- Sarking/underlay per m² $4–10; butyl flashing tape 75mm per m $5–12
- Gutter Colorbond per m $20–35; downpipe 90mm round per m $15–25; fascia per m $18–32
- Roof tiles (Monier Marseille) per m² $40–80; bedding/pointing per m $15–30
Sanity checks: Roof sheet replacement per m² $80–180; gutter replacement per m $120–250; valley replacement per m $200–400; full re-roof 200sqm $18,000–35,000`;

    if (t.includes("hvac") || t.includes("air")) return `
Labour: Licensed refrigerant/HVAC technician $120–155/hr
Materials (trade price):
- Split system 2.5kW (Mitsubishi MSZ-AP / Daikin FTXF25 trade) $900–1,400
- Split system 3.5kW $1,100–1,700; 5.0kW $1,500–2,200; 7.1kW $2,000–3,000
- Installation kit (5m pipe, cable, brackets, drain) $150–300; extra pipe per m $25–50
- Refrigerant R32 per kg $25–50; vacuum pump hire $0 (own tool); flare tool consumables $15–30
- Flexible duct 250mm per m $20–45; rigid duct 250mm per m $30–60
- Air filter replacement standard $35–90; HEPA filter $80–200
Sanity checks: Split system supply & install 2.5kW $2,200–3,800; 5kW $3,200–5,500; service/clean $180–350; ducted system per outlet $600–1,200`;

    if (t.includes("concret")) return `
Labour: Concreter $65–95/hr; form, pour & finish per m² $80–180
Materials (trade price):
- Ready-mix concrete 20MPa per m³ delivered $200–300; 25MPa $220–330; 32MPa $250–360
- Concrete pump hire per day $600–1,400; agitator truck extra distance per km $8–15
- Steel mesh SL72 per m² $15–28; SL82 per m² $20–35; rebar 12mm per m $8–15
- Formwork pine per lm $35–65; stakes per 10 $15–30; form release oil 20L $80–130
- Expansion joint foam per m $12–25; concrete sealer 10L $80–150; liquid hardener 10L $70–130
Sanity checks: Shed slab 6×6m (100mm) $4,000–9,000; house slab per m² $120–220; driveway per m² $150–300; footpath per m² $100–200`;

    if (t.includes("brick")) return `
Labour: Bricklayer $80–120/hr (or $120–200 per 1,000 bricks laid)
Materials (trade price):
- Standard clay brick (Boral/PGH trade, per 1,000) $900–1,600; recycled brick per 1,000 $400–900
- Besser block 390×190×190mm $4–9 each; half block $3–6 each
- Mortar mix 20kg bag $15–25; hydrated lime 20kg $18–30
- Sand per tonne delivered $60–100; cement per 20kg bag $16–25
- Wall ties per 100 $25–45; DPC damp proof course per m $3–8; control joint strip per m $8–15
Sanity checks: Single skin brick wall per m² $150–300; double brick cavity per m² $280–500; brick letterbox $400–900; brick retaining wall per m² $300–600`;

    if (t.includes("lock")) return `
Labour: Locksmith $90–130/hr; after-hours callout premium 50–100%
Materials (trade price):
- Lockwood 001 deadbolt (trade) $60–110; Lockwood 003 double cylinder $80–140
- Lockwood 570 lever set $90–180; Gainsborough lever set $70–150
- Lockwood 7444 deadlatch $45–90; door closer heavy duty $80–200; door chain $15–35
- Master key blank $8–25; key cutting per key $5–15; re-pinning pins per set $10–25
- Padlock 50mm hardened $35–80; hasp & staple $15–40; security screws per 10 $8–20
Sanity checks: Deadbolt supply & fit $200–450; lockout callout $180–380; re-key 3 locks $200–400; master key system quote separately`;

    // Default: General / Handyman
    return `
Labour: Handyman $65–95/hr; specialist trades $100–145/hr
Materials (trade price):
- Fasteners/fixings assorted (lot per job) $20–80; silicone sealant tube $15–30; gap filler tube $12–22
- Plasterboard 10mm (sheet 2400×1200) $20–40; plaster jointing compound 10kg $25–45; cornice per m $5–12
- PVC pipe 50mm per m $8–16; 90mm per m $14–25; PVC elbow $5–15 each
- Timber batten 70×35 per m $4–8; Dynabolts M10 per 10 $18–35; Fischer plugs per 10 $5–15
- Sandpaper assorted (lot) $15–35; mineral turps 1L $15–25; WD-40 $8–18
Sanity checks: TV mounting $150–300; flat-pack assembly $80–200 per item; fence paling replacement $30–80 each installed; door hinge replacement $150–300 per door`;
  }

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
      const pricingReference = getTradeReferencePricing(tradeType || "general");

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

AUSTRALIAN TRADE PRICING REFERENCE — 2025 market rates. Use these as your pricing anchor:
${pricingReference}

CRITICAL RULES — follow these exactly:
1. LINE ITEMS must be specific. BAD: "Labour". GOOD: "Labour – remove existing hot water unit, install new unit, connect copper pipework and test". BAD: "Materials". GOOD: "25mm copper half-union x2 @ $18 each".
2. ALWAYS break labour and materials into SEPARATE line items. Never bundle them.
3. LIST ORDER: call-out/travel first (if applicable), then labour items, then materials, then any permit or disposal fees.
4. QUANTITIES must be real numbers — if 3 fittings are needed, quantity is 3, unitPrice is cost per fitting.
5. NEVER under-quote. Australian tradies routinely lose money from thin margins. Include: travel/setup time, consumables (tape, sealant, fixings), waste disposal where applicable, and at least 15 minutes of post-job cleanup time.
6. USE REAL AUSTRALIAN PRICING: Use the reference table above for all labour and material prices. Do not invent prices outside the ranges given without good reason.
7. NOTES section must include: what is NOT included (e.g. "Excludes wall patching or painting"), any assumptions (e.g. "Assumes existing wiring is to code"), and validity period.
8. jobTitle must be professional and specific — suitable to show a client on a formal document.
9. CROSS-CHECK every price against the AUSTRALIAN TRADE PRICING REFERENCE before finalising. If a material or labour rate differs by more than 20% from the reference ranges, adjust it — unless the job description specifically calls for a premium brand, remote location, or unusual circumstance.${pricingInstructions}`;

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
        console.error("Settings validation error:", err.errors);
        res.status(400).json({ message: err.errors.map(e => `${e.path.join(".")}: ${e.message}`).join(", ") });
      } else {
        console.error("Settings save error:", err);
        const msg = err instanceof Error ? err.message : "Internal server error";
        res.status(500).json({ message: msg });
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
