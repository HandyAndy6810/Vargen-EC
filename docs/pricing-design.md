# Vargen Pricing Design

Nov 10, 2026 · Andrew Youkhana

> Saved from Andrew's design doc (PDF, 10 Nov 2026) so later sessions can read it.
> It is the plan for several briefs, built one step at a time (see **Build order**
> at the end). Don't build it all at once.

## Summary

Vargen stops letting the AI invent prices. The AI's job shrinks to understanding the job
(what type, what measurements). Trade templates pick the items, code does the maths,
and prices come from each tradie's own records. Nobody maintains a central price list.

Today the AI writes every price itself, guided only by rough notes for 7 trades in
`server/trade-knowledge.ts`. A sanity check (`shared/price-sanity.ts`) catches prices
that are about 10x off, for around 10 item types. That's why quotes in the 3 Nov test were
"hit or miss" (q7), and why a house slab got loose rebar instead of mesh.

"Wrong price" is really four different problems, and each has its own fix:

| Problem | Example | Fix | Ongoing upkeep |
|---|---|---|---|
| Wrong items | Loose rebar on a house slab | Trade templates | None |
| Wrong quantities | A 600 mm driveway | Input checks, and code does the quantity maths | None |
| Wrong unit prices | Prices hit or miss | Each tradie's own prices, captured automatically | None for Andrew |
| Wrong maths | Call out counted as labour | Bug fixes with tests | None |

## Rules we agreed

- **No price list for Andrew to maintain.** Prices come from each tradie's own business
  and keep themselves current.
- **The AI understands, code calculates.** The AI picks the job type and reads the
  measurements. Templates choose the items, code works out quantities and totals,
  and the AI never writes a price.
- **Every price shows where it came from:** "your price, 3 weeks ago" or "estimate, check
  this".
- **Untouched AI lines never count as real prices.** Only receipts, invoices, quick setup
  entries and lines the tradie edited before sending feed their price list.
- **Zero technical ability.** Capturing prices uses things tradies already do: fixing a price,
  taking a photo, tapping Share. No email rules, no settings.
- **Each tradie's data only improves their own quotes.** Nothing is shared between
  accounts at launch.
- **Right beats instant.** First impressions matter most, so a quote that's right is worth
  one or two quick questions.

## How a quote gets priced

1. **The tradie describes the job** (typed, spoken or shared in).
2. **The AI reads it** and returns structured facts only: the job type (which template), the
   measurements (area, length, thickness, number of points) and the options (finish,
   access, removal of old work). It returns no prices.
3. **Input checks** test those facts against sensible ranges for the job type. Anything odd,
   or anything missing that changes the price, becomes one short question ("600 mm
   thick? Most driveways are 100 to 150 mm"). There are at most 3 questions, and only
   when they matter.
4. **The template builds the lines:** the right items for that job, with quantities from
   formulas (for example m² × thickness → m³, plus waste).
5. **Labour hours** come from the template's rates per unit of work, adjustable by the
   options (difficult access adds time). They're priced at the tradie's charge out rate.
6. **Each material line gets a price** from the tradie's own price list. If there's none, the AI's
   estimate is used, marked "estimate, check this".
7. **Code adds everything up:** markup on materials, the call out fee as its own line, GST,
   totals. The same money rules as today (`shared/money.ts`).
8. **Review shows the source on every line,** so the tradie knows which lines to check.
9. **Lines the tradie edits before sending** become their price for next time.

If no template fits a job, Vargen falls back to today's AI quote, with every line marked as an
estimate. A tradie never gets stuck.

## Where a tradie's prices come from

Four sources feed one price list per tradie. The newest real price for an item wins.

| Source | What the tradie does | Counts as | Status |
|---|---|---|---|
| Learning from edits | Changes a price on a quote and sends it | Their price | New. The AI vs sent data already exists (#145) |
| Share to Vargen | Shares an invoice PDF or receipt photo from any app | Their price, plus an expense | New |
| Receipt scan in the app | Takes a photo in Vargen | Their price, plus an expense | Exists. Needs to feed prices |
| Quick setup | Optionally types what they pay for about 10 common items at sign up | Their price | New |

**Which price wins for a line:**

1. A matching item in their price list, newest first. It shows "your price" and how old it is.
2. Otherwise, the AI's estimate. It shows "estimate, check this", and Review counts these
   so the tradie knows what to look at.

**What counts and what doesn't:**

- **Counts:** receipt and invoice lines; quick setup entries; quote lines the tradie changed
  before sending.
- **Never counts:** AI lines sent untouched; lines from a quote that was never sent; prices
  outside the sanity bands, which are held back as "check this" rather than saved.

**Matching is the hard part.** "SL82 MESH 6X2.4" on an invoice has to match "reinforcing
mesh" on a quote, with the right unit (sheet vs m²) and GST treatment (receipts include
GST, quote costs don't). The AI suggests a match, each tradie's confirmed matches are
remembered, and anything uncertain goes into a small "Not sure what this is" list the
tradie can sort with a tap. Build matching once and use it for receipts, shared invoices and
edits.

## Share to Vargen

In any app (Gmail, Photos, Messages, Files), the tradie taps **Share → Vargen**. Vargen
opens, shows what was shared, and asks "What do you want to do with this?" The AI
guesses the best option and puts it first. The tradie always confirms, and nothing is saved
silently.

| Shared item | Options | Default |
|---|---|---|
| Supplier invoice or receipt (PDF or photo) | Add to expenses · Link to a job | Add to expenses, which also updates their prices |
| Job site photo | Add to a job · Attach to a quote · Start a quote from this | Ask |
| A customer's message or email text | Start a quote from this · Save to a customer's notes | Start a quote, with the text prefilled |
| Contact card | Save as customer | Save as customer |
| Several files at once | The same menu, applied to all | Based on the first file |

**Rules:**

- **It needs a Build.** Appearing in the share sheet is a native feature, so it can't ship as an
  app update.
- **Hand straight into the main app.** iPhone share windows have tight memory limits, so
  do the work in Vargen, not inside the share window.
- **Not logged in:** log in, then carry on with the shared file.
- **No signal:** hold it in the offline outbox, like quotes.
- **Can't read it:** say so plainly ("Vargen can't use this kind of file").
- **Library to be checked first:** there are community add ons for Expo share targets, but
  none has been verified with this setup (Expo SDK 54, new architecture off, no
  Reanimated). Claude Code must confirm one works before building on it.

## Right items and quantities

**Trade templates** describe how a type of job is built, not what things cost. A template is
written once per job type and rarely changes. Each one has:

- **Inputs it needs**, each with a sensible range (for a residential slab: area 1 to 200 m²,
  thickness 100 to 150 mm, with "reinforcement: mesh" as the default).
- **Items, with quantity formulas.** For a residential slab: concrete m³ = area × thickness ×
  1.05 waste; SL82 mesh sheets = area ÷ the sheet area, rounded up, plus overlap; bar
  chairs, plastic membrane, edge formwork by perimeter.
- **Labour hours per unit of work**, with option adjustments (pump vs barrow, access).
- **What to ask** when an input is missing or outside its range.
- **Compliance notes** carried over from today's `trade-knowledge.ts`.

**Input checks** run before any quote is built. A value outside the template's range becomes
a question, never a silent quote. Examples: a 600 mm driveway, a 2 m² deck, 400
downlights in a house.

**Which trades first** is an open question (see below). Doing two or three trades properly
makes a better first impression than seven done loosely. Any job without a template still
gets today's AI quote, marked as an estimate.

## Maths bugs to fix now

These can ship before any of the bigger work. They're from a read of `main` @ `e89d537`
and the live settings. Claude Code must confirm each one before fixing it.

| Bug | What the code does | Fix |
|---|---|---|
| **Call out (or other flat lines) counted as labour hours** | On Review, the Labour card's Hours adds up the quantity of **every** labour line (`review.tsx` ~L73), including flat or lump sum lines priced "each". One of those reads as 1 hour. | Hours counts only lines whose unit is hours. Flat labour lines show separately. |
| **Labour card shows the wrong rate** | The rate shown is taken from the **first** labour line (`labour[0]`), which may be a flat line, not from the hourly lines or settings. | Show the charge out rate from the hourly lines, or from settings if there are none. |
| **$85/hr instead of $80** | Andrew's saved charge out rate in the live database **is $85** (the app default). Either a change to $80 didn't save, or it was never changed. | Andrew: set it to $80 in AI quoting and check it sticks after reopening. If it doesn't, it's a settings save bug. |

**Worth knowing about Andrew's live settings:** "Mark up labour too" is **on**, markup is 80%,
and the call out fee is on at $150. With labour marked up, an $85 rate shows to the
customer as $153/hr. That's correct for that setting, but it's easy to forget the toggle is on.

## Privacy and data rules

- **The pricing data keeps only:** item, quantity, unit, unit price, date and supplier name.
  No customer names, site addresses, job references, card digits or account numbers.
- **Receipt and invoice images** stay with the expense record (they're the tradie's own
  records). The pricing list only holds the extracted fields.
- **Everything is deleted with the account,** including price history and matching
  memory. Extend the existing account deletion (#148).
- **Nothing is shared between accounts.** No averages, no "area prices", no other tradie's
  data.
- **Every price shown as "estimate" is clearly labelled,** and the terms say the tradie is
  responsible for what they send.
- **The AI provider is overseas (Groq, US).** The privacy policy must say so. The database
  is in AWS Sydney. Replit hosting is likely US, so check it.
- **Before launch:** privacy policy, terms and the App Store privacy labels need writing.
  One session with a startup or tech lawyer is recommended. This isn't legal advice.

## After launch

**Connect your email.** The tradie taps "Sign in with Microsoft" or "Sign in with Google"
once, and Vargen picks up supplier invoices from their inbox by itself. It's the easiest
option for the tradie, but it comes after launch because:

- "let this app read my email" is a big trust ask for a new app;
- reading Gmail needs Google's approval for restricted access, which includes a
  security assessment (check the current requirements and cost);
- Microsoft is generally easier, so do it first.

Vargen must only ever look at supplier invoices, and the privacy policy must say so.

**Pooled material costs (opt in).** Only after legal advice: material costs only, never labour
rates, markups or sell prices; broad regions; a minimum number of contributors before
anything shows.

**Supplier partnerships.** Suppliers send a tradie's prices directly, with their permission.
This needs leverage that only comes with volume.

## Open questions for Andrew

**Decided 10 Nov:**

- **Launch trades:** plumbing, electrical, landscaping, fencing, concreting, handyman and
  carpentry. To keep this doable, each trade launches with templates for its **most
  common jobs only** (below). Any other job still gets an AI quote marked as an estimate.
- **"Mark up labour too" is off by default** for new tradies. The charge out rate is what the
  customer pays, and markup applies to materials only.

**Launch job templates.** Andrew's longer list (10 Nov) splits three ways. Most additions are
**options on an existing template**, which is cheap. Many small repair jobs fit one shared
**service call** template. A few are **new templates**.

| Trade | Templates | Options on those templates | Service call covers |
|---|---|---|---|
| Concreting | Slab (house, shed, patio or alfresco) · Driveway · Path · Footings | Finish: plain, coloured, exposed aggregate · Old concrete removal | — |
| Fencing | Colorbond · Timber paling · Pool fence · Aluminium slat · Picket | Gates: single, double, sliding · Old fence removal and disposal | — |
| Landscaping | Turf (real or artificial) · Garden bed · Sleeper wall · Paving | Edging · Ag line drainage · Irrigation | — |
| Plumbing | Tap or mixer · Toilet · Hot water system · Appliance install (dishwasher, washing machine) · Gutters and downpipes | — | Blocked drain · Leaking or burst pipe · Leaking shower |
| Electrical | Downlights · Power points · Ceiling fan · Switchboard upgrade · Smoke alarms · Outdoor or sensor lights · Data and TV points · Oven or cooktop install | — | Fault finding (safety switch tripping) |
| Carpentry | Deck · Pergola · Hang doors · Skirting and architraves · Shelving or wardrobes | — | Deck repairs |
| Handyman | Fixed price: TV mounting · Flat pack assembly · Gutter cleaning · Plaster patching · Silicone resealing | — | Hourly odd jobs |

**Service call template:** call out fee + hours at the charge out rate + parts, with a note that
the final price depends on what's found. It suits any repair where nobody knows the fix
until they're on site.

**Later, not launch:** gas fitting, EV chargers, framing and stairs. They're heavier on
compliance, permits or site specific engineering, so they get an AI estimate until a
template exists.

**Quick setup (decided 10 Nov):**

1. The tradie **picks their trade** (or several).
2. Vargen shows the **most common items** for that trade, as a list with an empty price box
   beside each.
3. They type what they pay for any they like. **Everything is optional,** and there's a big
   **Skip**.
4. Prices entered become "your price" straight away.
5. They can come back to it any time from Settings.

**"Other" trade (anyone who sends quotes or invoices):**

- Picking **Other** asks "What do you do?" in plain words ("dog groomer", "wedding
  photographer", "bookkeeper").
- The AI suggests likely items and how they charge (per hour, per item, per package),
  **clearly marked as suggestions**. They can edit, delete or add their own.
- Their quotes use **generic templates**: hourly, per item, packages (basic / standard /
  premium) and service call. This matches the quoting patterns in the project plan.
- Item lists for the seven launch trades are fixed, written once and checked by a tradie.
  Only "Other" uses AI generated suggestions.

**Still open:**

- [x] ~~**Charge out rate:** $80 is saved and "Mark up labour too" is off (checked in the live
  database, 10 Nov).~~
- [ ] **Item lists:** Andrew reviews the draft lists below.
- [ ] **Template sense check:** someone who does each trade looks over that trade's
  templates and item list.
- **Real supplier invoices: not happening.** Andrew won't be collecting sample invoices.
  Matching gets built and tested against receipts and made up sample invoices instead,
  then tuned from what real users share after launch. The "Not sure what this is" list is
  the safety net.

## Quick setup item lists (draft)

The items a tradie sees after picking their trade, in the units they'd buy them in. Every
price box is optional. **This is a draft (Claude's first pass plus Andrew's additions, 10 Nov),
not checked by a tradie yet.** There are 13 trades: the 7 launch template trades plus 6 that
get quick setup lists but no templates yet.

### Launch template trades

#### Concreting

| Item | Unit |
|---|---|
| Premix concrete, 20 MPa | m³ |
| Premix concrete, 25 MPa | m³ |
| Premix concrete, 32 MPa | m³ |
| Reinforcing mesh SL82 (6 × 2.4 m) | sheet |
| Reinforcing mesh SL72 (6 × 2.4 m) | sheet |
| Trench mesh | length |
| Reo bar | length |
| Bar chairs | bag |
| Tie wire | roll |
| Builders plastic / vapour barrier (200 µm) | roll |
| Formwork timber | lineal m |
| Expansion joint | lineal m |
| Road base | tonne |
| Concrete sealer | litre |
| Colour oxide | bag |
| Concrete pump hire | per job |

#### Fencing

| Item | Unit |
|---|---|
| Colorbond fence panel (sheets + rails), 1.8 m high | panel |
| Colorbond fence post | each |
| Treated pine paling | each |
| Treated pine rail | lineal m |
| Timber post | each |
| Steel post | each |
| Plinth | lineal m |
| Capping | lineal m |
| Rapid set post concrete | bag |
| Pool fence glass or aluminium panel | panel |
| Glass spigot | each |
| Pool gate with self closing hinge and latch | each |
| Gate hinges | pair |
| Gate latch | each |
| Aluminium slat panel | panel |
| Fixings (screws, nails) | box |

#### Landscaping

| Item | Unit |
|---|---|
| Turf (e.g. buffalo, couch) | m² |
| Turf underlay soil | m³ |
| Garden soil mix | m³ |
| Mulch | m³ |
| Plants (tube to 200 mm pot) | each |
| Decorative pebbles | tonne |
| Treated pine or hardwood sleeper | each |
| Steel H post (for sleeper walls) | each |
| Geofabric | m² |
| Road base | tonne |
| Bedding sand | tonne |
| Pavers | m² |
| Garden edging | lineal m |
| Ag pipe (slotted drainage) | lineal m |
| Drainage gravel / blue metal | tonne |
| Irrigation fittings | each |
| Artificial turf | m² |

#### Plumbing

| Item | Unit |
|---|---|
| Mixer tap (kitchen or basin) | each |
| Toilet suite | each |
| Hot water system, electric 250 L | each |
| Hot water system, gas continuous flow | each |
| Hot water system, heat pump | each |
| Tempering valve | each |
| Pressure limiting valve | each |
| Isolation valve | each |
| Flexible hose connector | each |
| Copper pipe 15 mm | lineal m |
| PEX pipe 16 mm | lineal m |
| PVC pipe | length |
| PVC fittings | each |
| Quarter round gutter | lineal m |
| Downpipe 90 mm | length |

#### Electrical

| Item | Unit |
|---|---|
| LED downlight | each |
| Double power point (GPO) | each |
| Light switch | each |
| Ceiling fan | each |
| Smoke alarm, 240 V interconnected | each |
| TPS cable 2.5 mm² | roll |
| TPS cable 1.5 mm² | roll |
| Cat6 cable | roll |
| Conduit | length |
| RCBO (safety switch breaker) | each |
| Isolator | each |
| Surge protection | each |
| Switchboard enclosure | each |
| Outdoor sensor light | each |
| Data point (Cat6) | each |
| TV antenna point | each |
| EV charger | each |

#### Carpentry

| Item | Unit |
|---|---|
| Decking boards (merbau or composite) | lineal m |
| Bearers | lineal m |
| Treated pine joists (90 × 45) | lineal m |
| Framing timber | lineal m |
| Joist hangers | each |
| Post stirrups / anchors | each |
| Post concrete | bag |
| Deck screws | box |
| Decking oil | litre |
| Pergola post (treated pine or steel) | each |
| Pergola roofing sheet | sheet |
| Internal door (hollow core) | each |
| Door hardware (hinges, latch, handle) | set |
| Skirting board | lineal m |
| Architrave | lineal m |

#### Handyman

| Item | Unit |
|---|---|
| TV wall bracket | each |
| Wall plugs, anchors and fixings | pack |
| Silicone sealant | tube |
| Plaster patch / filler | tub |
| Sandpaper | pack |
| Paint (touch up) | litre |
| Flyscreen mesh | roll |
| Gutter guard | lineal m |
| Skip bin / tip fee | per job |

### Quick setup only (no templates yet)

These trades get a quick setup list so their own prices are captured from day one. Their
quotes use the AI estimate plus their own prices until templates are built.

#### Painting

| Item | Unit |
|---|---|
| Interior wall paint | litre |
| Exterior paint | litre |
| Ceiling paint | litre |
| Primer / undercoat | litre |
| Gap filler | tube |
| Filler | tub |
| Sandpaper | pack |
| Masking tape | roll |
| Drop sheets | each |

#### Tiling

| Item | Unit |
|---|---|
| Tiles | m² |
| Tile adhesive | bag |
| Grout | bag |
| Waterproofing membrane | litre |
| Primer | litre |
| Screed | bag |
| Silicone | tube |
| Tile trim | length |
| Levelling clips | bag |

#### Roofing

| Item | Unit |
|---|---|
| Colorbond roof sheet | lineal m |
| Roof tiles | each |
| Ridge capping | lineal m |
| Flashings | lineal m |
| Roof screws | box |
| Sarking | roll |
| Battens | lineal m |
| Pointing compound | bag |
| Gutter | lineal m |
| Downpipe | length |

#### Plastering

| Item | Unit |
|---|---|
| Plasterboard | sheet |
| Wet area board | sheet |
| Cornice | length |
| Base coat compound | bag |
| Top coat compound | bag |
| Paper tape | roll |
| Stud adhesive | tube |
| Plasterboard screws | box |
| Corner bead | length |

#### Air conditioning

| Item | Unit |
|---|---|
| Split system unit (by kW) | each |
| Pipe pair | lineal m |
| Line cover / duct | length |
| Wall bracket or condenser pad | each |
| Drain line | lineal m |
| Isolator | each |
| Cable | lineal m |
| Circuit breaker | each |

#### Bricklaying

| Item | Unit |
|---|---|
| Bricks | per 1000 |
| Blocks | each |
| Sand | tonne |
| Cement | bag |
| Lime | bag |
| Brick ties | box |
| Lintels | each |
| Damp proof course | roll |
| Core fill | m³ |
| Brick cleaner | litre |

## Build order

Each step is one Claude Code brief. Each later step reuses what the earlier ones built.

1. **Maths bug fixes** (Labour card hours and rate). Small, and ships as an app update.
2. **Price list foundation:** a per tradie price list table, the source badge on Review lines
   ("your price" / "estimate"), and **learning from edits** using the AI vs sent data from
   #145. Untouched lines are excluded. Deleted with the account.
3. **Quick setup** at sign up, writing into the same price list.
4. **Matching engine + receipts feed prices:** the existing receipt scanner writes its lines
   into the price list via matching, with the "Not sure what this is" list.
5. **Share to Vargen:** first confirm a share library works with this setup, then build the
   share menu, reusing receipt reading and matching. Needs a Build.
6. **Trade templates, input checks and quantity maths** for the launch trades, with the AI
   returning facts only and falling back to today's quote when no template fits.

Steps 1 to 3 can go as soon as the current test run is done. Step 6 waits on the launch
trades decision. Xero and Stripe are separate briefs, also needed for launch.
