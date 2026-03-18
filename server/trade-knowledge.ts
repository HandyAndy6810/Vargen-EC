/**
 * Trade-specific knowledge base for AI quote generation.
 * Each trade has its own quoting logic, units of measure, cost drivers,
 * compliance requirements, formulas, and gotchas.
 *
 * This is essentially a prompt engineering library — the AI uses this context
 * to generate accurate, trade-specific quotes for Australian tradespeople.
 */

interface TradeKnowledge {
  name: string;
  unitsOfMeasure: string;
  costDrivers: string;
  compliance: string;
  materialsReference: string;
  formulas: string;
  gotchas: string;
}

const PLUMBING: TradeKnowledge = {
  name: "Plumbing",
  unitsOfMeasure: `
- Labour: per hour or per job (flat rate for common tasks like tap replacement)
- Pipe: per linear metre (distinguish copper, PEX, PVC — each has different rates)
- Fittings: per each (elbows, tees, unions, valves)
- Hot water systems: per unit (supply + install as package)
- Drainage: per linear metre + per pit/junction
- Fixtures: per each (taps, toilets, basins — supply + install)`,
  costDrivers: `
- Access difficulty (under-floor, in-wall, ceiling cavity, confined spaces)
- Pipe material: copper is 2-3x the cost of PEX for material + slower to install
- After-hours / emergency callout premiums (50-100% surcharge)
- Number of storeys (scaffold or ladder work adds time)
- Whether existing pipework is to code or needs upgrading
- Distance from supplier / parts availability
- Backflow prevention device testing & certification (licensed work)`,
  compliance: `
- All plumbing work must be done by or supervised by a licensed plumber
- Plumbing permits required for new installations and major alterations
- Hot water tempering valves mandatory (max 50°C at bathroom outlets)
- Backflow prevention devices required at boundary
- Work must comply with AS/NZS 3500 (Plumbing & Drainage Code)
- Certificate of Compliance must be issued to homeowner after work
- Gas plumbing requires separate gas-fitter licence`,
  materialsReference: `
- 20mm copper pipe $12–18/m; 25mm $18–28/m; copper elbow/tee fitting $10–22 each; compression fitting $18–35
- PEX pipe 16mm $2–4/m; 20mm $3–6/m; PEX crimp fitting $5–12 each
- Brass ball valve 20mm $35–60; 25mm $50–80
- Rheem 315L electric HWS $1,100–1,450; Rinnai B16 continuous flow HWS $950–1,200; Dux 26L gas continuous $1,050–1,350
- Basin mixer tap (mid-range) $150–350; kitchen sink mixer $180–450; shower mixer valve $200–550
- Toilet suite $280–650; 600mm flexible hose $18–30 each
- Push-fit 20mm coupling $8–18; teflon tape/thread sealant (lot) $5–12
- PVC DWV pipe 50mm $8–16/m; 90mm $14–25/m; 100mm $18–30/m
- Sewer junction 100mm $25–50; inspection opening $20–40`,
  formulas: `
- Tap replacement: 0.5–1hr labour + tap cost + 2x flexi hoses + consumables
- HWS replacement: 2–4hrs labour + unit cost + valves + pipe modifications + old unit disposal ($50–100)
- Toilet install: 1–2hrs labour + suite cost + flexi connector + pan collar + silicone
- Rough-in (new bathroom): estimate pipe runs in metres, add 15% waste, count fittings, add 4–8hrs labour
- Drainage: linear metres × rate + junctions/pits + excavation if underground
- Always add consumables allowance: $30–60 per job (tape, sealant, flux, solder, clips)`,
  gotchas: `
- ALWAYS quote old unit removal/disposal as a line item ($50–120)
- Copper soldering in confined spaces = extra time + fire safety blanket
- Older homes may have galvanised pipe that crumbles on touch — quote for contingency
- Hot water tempering valve is mandatory and often forgotten — $120–200 installed
- "Simple tap replacement" can become a re-pipe if isolating valves don't exist
- Water authority inspection fees may apply for boundary work ($150–300)
- Don't forget to quote the Certificate of Compliance paperwork time (15–30 min)`
};

const ELECTRICAL: TradeKnowledge = {
  name: "Electrical",
  unitsOfMeasure: `
- Labour: per hour or per point (a "point" = one power point, switch, or light installed)
- Cable: per linear metre (different gauges: 1.5mm, 2.5mm, 4mm, 6mm T&E)
- Circuit breakers: per each (MCB, RCD, RCBO)
- Light fixtures: per each (supply + install)
- Switchboard: per unit (upgrade is a common standalone job)
- Data/comms: per point (Cat6 cable run + termination)`,
  costDrivers: `
- Number of points / circuits (more points = economies of scale)
- Cable run distances (long runs through roof/wall cavities take time)
- Switchboard capacity (enough spare ways? or upgrade needed)
- Single vs multi-storey (ladder/scaffold work, longer cable runs)
- Surface mount vs concealed wiring (concealed = 2-3x labour)
- Age of existing wiring (aluminium wiring, old VIR = mandatory upgrade)
- After-hours / emergency callout premiums`,
  compliance: `
- ALL electrical work must be done by a licensed electrician
- Electrical Safety Certificate required for all work
- Must comply with AS/NZS 3000 (Wiring Rules) and state regulations
- RCD (safety switch) protection mandatory on all power and lighting circuits
- Smoke alarm compliance to AS 3786 — interconnected, in every bedroom + hallway
- Pool/spa electrical work has additional requirements (AS/NZS 3000 Section 6)
- Solar installations require CEC accreditation and grid connection approval`,
  materialsReference: `
- 2.5mm T&E cable $3.50–5.50/m; 1.5mm T&E $2–3.50/m; 6mm T&E $8–14/m; 4mm T&E $5–9/m
- Double GPO (Clipsal/HPM) $45–75; single GPO $30–50; weatherproof GPO $60–100; USB GPO $70–120
- LED downlight 10W $30–65; oyster ceiling light $40–90; exhaust fan $60–150; bathroom 3-in-1 $150–280
- Safety switch (RCD) 10A $90–150; MCB single pole $28–50; RCBO $80–140
- Switchboard 6-circuit (trade) $400–700; 12-circuit $600–1,000; 18-circuit $800–1,400
- Conduit 25mm per m $4–8; cable clips per 100 $12–25; junction box $12–30
- Smoke alarm 240V interconnected $55–120 each
- Cat6 cable per m $2–4; Cat6 wall plate + jack $15–35`,
  formulas: `
- Per power point: 1 × GPO + ~5m cable avg + labour 30–45min = $250–450 installed
- Per LED downlight: 1 × fitting + ~3m cable + labour 20–30min = $180–350 installed
- Switchboard upgrade: board cost + new RCDs/MCBs + 4–8hrs labour = $1,500–4,000
- Safety switch add: 1 × RCD/RCBO + 1hr labour = $300–500
- Ceiling fan: fan cost + mounting kit + ~5m cable + labour 1–1.5hrs = $350–650
- Smoke alarm compliance (3-bed): 4–6 alarms × $120–180 each installed
- Always add 10% cable waste factor and $30–50 consumables (cable ties, tape, connectors)`,
  gotchas: `
- Switchboard may be full — quote switchboard upgrade as a contingency or separate option
- Aluminium wiring (pre-1980s homes) requires special connectors or full rewire
- Ceiling insulation makes cable runs slower — add 30% labour for insulated ceilings
- Strata/body corporate may require approval before work starts — note in exclusions
- Safety switch retrofit on old switchboards may require the entire board to be replaced
- Don't forget Electrical Safety Certificate lodgement time (15–30 min paperwork)
- Smoke alarm laws changed 2022 — every bedroom + hallway + interconnected`
};

const CARPENTRY: TradeKnowledge = {
  name: "Carpentry / Building",
  unitsOfMeasure: `
- Labour: per hour or per square metre (decking, framing, cladding)
- Timber: per linear metre (structural, decking, trim) or per sheet (plywood, MDF)
- Hardware: per each (brackets, joist hangers, bolts)
- Decking: per square metre (materials + labour combined is common)
- Fencing: per linear metre (materials + labour)
- Doors/windows: per each (supply + install or install-only)`,
  costDrivers: `
- Timber species: pine (cheapest) vs hardwood vs engineered (LVL, glulam)
- Complexity of design (straight deck vs multi-level with stairs and balustrade)
- Height / scaffold requirements (anything above 2m needs edge protection)
- Site access (can materials be delivered close to work area?)
- Demolition / removal of existing structures
- Council approval / building permit requirements
- Finish quality: rough framing vs furniture-grade carpentry`,
  compliance: `
- Building permit required for structures over certain size (varies by state)
- Structural timber must be graded (MGP10/MGP12 or F-grade)
- Decks over 1m height require engineer-designed balustrades (1000mm min height)
- Termite management required for new timber structures in termite zones
- Must comply with NCC/BCA and relevant Australian Standards
- Owner-builder permits required if homeowner is managing the build
- BAL (Bushfire Attack Level) rating may dictate timber species in fire zones`,
  materialsReference: `
- Structural pine 90×45 MGP10 $5–9/m; 190×45 $12–18/m; 240×45 $16–24/m
- F17 hardwood 90×45 $12–20/m; LVL beam 150×45 $22–35/m; 200×63 LVL $35–55/m
- Plywood 12mm CD $65–90/sheet; 19mm $90–125/sheet; 7mm $45–65/sheet
- Decking: treated pine 90×22 $6–10/m; merbau 90×19 $14–22/m; composite $18–35/m
- Treated pine sleeper 200×75 $20–32/m; 200×50 $14–24/m
- Joist hanger $8–18 each; post stirrup $15–30; framing angle $3–8 each
- Framing nails 90mm per kg $8–15; batten screws 65mm (500pk) $30–50; coach bolts M12 $3–8 each
- Door (hollow core) $80–180; door (solid core) $200–450; door furniture set $40–120`,
  formulas: `
- Timber deck: area × 2.5 = lineal metres of decking boards; area × 0.6 = LM of joists; add bearers + posts
- Deck cost estimate: treated pine $300–450/sqm all-in; hardwood $450–700/sqm; composite $500–800/sqm
- Pergola: 4 posts + 2 beams + rafters at 600mm centres + shade battens → typically $4,000–12,000 for 4×4m
- Fencing: posts at 2.4m centres + 3 rails + palings; pine $150–280/m; hardwood $250–400/m
- Framing labour: ~1 sqm of wall frame per hour for experienced carpenter
- Always add 10–15% timber waste factor and $50–100 fastener/hardware allowance`,
  gotchas: `
- Timber prices are volatile — quote validity 14 days max for large jobs
- Treated pine needs 6–8 weeks to dry before staining/oiling — mention in notes
- Underground services (gas, water, electrical) must be located before post holes
- Council setback rules may affect fence/structure placement — note as exclusion
- Hardwood is beautiful but HEAVY — factor in extra labour for handling
- Merbau stains concrete orange — warn clients about tannin run-off
- Always check for asbestos before demolishing any pre-1990 structure`
};

const PAINTING: TradeKnowledge = {
  name: "Painting",
  unitsOfMeasure: `
- Labour: per square metre (most common for quoting) or per hour
- Interior walls/ceilings: per sqm (includes prep + 2 coats)
- Exterior: per sqm (weatherboard, render, brick — different rates)
- Doors: per each (single side or both sides)
- Trim/skirting: per linear metre
- Feature walls / specialty finishes: per sqm at premium rate`,
  costDrivers: `
- Surface condition (new plaster vs peeling paint vs water damage = huge prep variation)
- Number of coats required (fresh plaster = primer + 2 coats; repaint = 2 coats; dark-to-light = 3+ coats)
- Height / access (single storey vs two-storey vs high ceilings needing scaffolding)
- Number of colours (each colour change adds cutting-in time)
- Interior vs exterior (exterior = weather dependent, more prep, scaffold)
- Surface type: smooth plaster is fastest; textured/bagged brick is slowest
- Furniture moving / floor protection time`,
  compliance: `
- Lead paint testing required on any pre-1970 home before sanding/scraping
- Lead paint removal must follow AS 4361.2 — licensed removalist for high-risk work
- Height safety: scaffold or EWP required for work above 2m
- VOC regulations — use low-VOC paint where specified
- Body corporate / strata may require specific colour schemes — confirm before quoting
- Heritage-listed properties may have paint colour restrictions`,
  materialsReference: `
- Dulux Wash & Wear interior 15L $160–210; 10L $120–155
- Dulux Weathershield exterior 15L $180–240; 10L $130–175
- Taubmans All Weather 10L $120–165; Taubmans Endure interior 10L $100–140
- Solver interior 10L $90–140; British Paints 10L $80–120
- Primer/sealer (Dulux 1-Step/Zinsser) 10L $80–130
- Sugar soap 5L $35–60; sandpaper assorted (lot) $20–45; gap filler $12–22/tube
- 9" roller frame + cover $25–50; microfibre roller cover $8–18; 75mm brush $15–30
- Masking tape 48mm $8–15/roll; drop sheets canvas large $30–80
- Painter's caulk $8–15/tube; timber putty $12–25
- Coverage: approximately 1L covers 10–12sqm per coat`,
  formulas: `
- Interior walls: measure perimeter × wall height, subtract 50% for windows/doors → net sqm
- Ceilings: floor area = ceiling area (simple); add 10% for edges and cutting in
- Exterior: measure each elevation separately; weatherboard add 20% for overlap/texture
- Paint quantity: net sqm ÷ 10 = litres per coat × 2 coats + 10% waste
- Labour rate: interior smooth walls ~$20–35/sqm (supply + paint 2 coats)
- Exterior weatherboard: ~$30–50/sqm (supply + prep + paint 2 coats)
- A standard bedroom (4×4m, 2.7m ceiling) = ~35sqm walls + ~16sqm ceiling
- Full interior 3-bed house: ~200–280sqm of paintable surface (walls + ceilings + trim)`,
  gotchas: `
- Surface prep is 60–70% of the total job time — never under-quote prep
- Ceilings take 30–40% longer than walls per sqm (overhead work, neck strain)
- "Just a quick repaint" often reveals cracks, peeling, water damage that needs repair first
- Exterior work is weather-dependent — build in wet weather contingency days
- Dark colours over light = 2 coats; light over dark = 3+ coats (extra paint + labour)
- Cutting in around cornices and trim is slow — account for it in your per-sqm rate
- Furniture moving and protection can add 1–2 hours per room — list it as a line item
- Doors are time-consuming: both sides + edges + frame = $150–350 per door`
};

const LANDSCAPING: TradeKnowledge = {
  name: "Landscaping",
  unitsOfMeasure: `
- Labour: per hour or per square metre (turf laying, paving, mulching)
- Soil/mulch/gravel: per cubic metre (m³) delivered
- Turf: per square metre (supply + lay)
- Paving/concrete: per square metre
- Retaining walls: per square metre of wall face, or per linear metre
- Plants: per each (supply + plant)
- Irrigation: per zone or per linear metre of pipe`,
  costDrivers: `
- Site access for delivery trucks and machinery (bobcat, excavator)
- Slope / grade of the site (flat is cheapest; steep = retaining walls, drainage)
- Soil condition (rocky, clay, contaminated — affects excavation time and disposal)
- Volume of material (bulk delivery is cheaper per m³ than bagged)
- Demolition / removal of existing landscaping
- Drainage requirements (ag pipe, stormwater connection)
- Plant maturity (tube stock cheap but small; advanced trees $200–2,000+)`,
  compliance: `
- Retaining walls over 600mm typically require engineer design + council approval
- Stormwater must not be redirected onto neighbouring properties
- Tree removal may require council permit (check local tree preservation orders)
- Pool fencing must comply with AS 1926 if landscaping near a pool
- Underground services (Dial Before You Dig — DBYD) must be checked before excavation
- Sediment and erosion control for sites near waterways`,
  materialsReference: `
- Garden/topsoil per m³ delivered $90–150; premium organic soil mix per m³ $120–200
- Hardwood mulch per m³ delivered $75–120; pine bark per m³ $65–100; river pebble 20mm per m³ $120–200
- Ready-mix concrete 20MPa per m³ delivered $200–300; 25MPa $220–330
- Instant turf (couch/kikuyu) per m² $12–20; buffalo turf per m² $15–28
- Concrete paver 400×400mm $8–18 each; 600×600mm $15–30; sandstone per m² $60–120
- Retaining wall block (Boral/Adbri) 200×400 $10–22 each; timber sleeper 200×75 $80–180 each
- Steel garden edging 1.5mm per m $15–30; plastic edging per m $5–12
- Irrigation solenoid valve $30–60; controller 4-zone $80–160; drip line per m $2–5
- Decomposed granite per m³ $80–140; road base per m³ $50–90`,
  formulas: `
- Mulch coverage: 1m³ covers ~12.5sqm at 80mm depth; order area ÷ 12.5 = m³ needed
- Soil for garden beds: area × depth (usually 200–300mm) = m³; add 10% settlement
- Turf: measure area + 5% waste for cuts; labour 8–15sqm per hour for laying
- Retaining wall (block): wall face area ÷ block face area = number of blocks + 10%
- Paving: area + 5% waste for cuts; sand bed 30–50mm depth; base layer 75–100mm
- Concrete path: area × depth (100mm min) = m³ of concrete; add pump cost if >5m from truck
- Plant spacing: for hedging, plants per metre = 1000mm ÷ spacing in mm (e.g. 500mm spacing = 2/m)`,
  gotchas: `
- Soil volumes are always more than you think — excavation "bulks up" 30% when dug out
- Delivery access is critical — if truck can't get close, manual wheelbarrowing = $$$ labour
- Underground services (water, gas, NBN, power) MUST be located before digging — note DBYD
- Drainage is the unsexy part that makes or breaks a landscape job — never skip it
- Turf needs watering immediately after laying — ensure client has irrigation or hose access
- Concrete paving on expansive clay soil needs engineer-designed sub-base — note as exclusion
- Tree root zones: don't excavate within drip line of significant trees without arborist advice
- Seasonal pricing: turf and plants are cheaper in autumn/winter; concrete pours avoid extreme heat`
};

const CONCRETING: TradeKnowledge = {
  name: "Concreting",
  unitsOfMeasure: `
- Concrete: per cubic metre (m³) — always specify MPa strength grade
- Formwork: per linear metre of perimeter
- Steel reinforcement: per square metre (mesh) or per linear metre (rebar)
- Finished surface: per square metre (includes form, pour, finish)
- Concrete pump: per job or per m³ pumped
- Cutting/coring: per linear metre (cutting) or per each (core hole)`,
  costDrivers: `
- Concrete grade / MPa (20MPa standard; 25MPa driveways; 32MPa structural; 40MPa commercial)
- Thickness (100mm paths; 125mm residential slabs; 150mm driveways; 200mm+ industrial)
- Finish type: broom finish (cheapest), exposed aggregate (+$20–40/sqm), honed/polished (+$40–80/sqm), coloured (+$15–30/sqm), stamped (+$30–60/sqm)
- Access for concrete truck (direct pour vs pump required — pump adds $600–1,400)
- Reinforcement type: mesh (standard) vs rebar (structural, engineer-specified)
- Sub-base preparation (level site vs excavation + compacted base)
- Expansion joints and control joints (every 3–4m in slabs)`,
  compliance: `
- Building permit required for house slabs, structural footings
- Must comply with AS 2870 (Residential Slabs and Footings) and AS 3600 (Concrete Structures)
- Engineer certification required for structural slabs and footings
- Termite management system required for new residential slabs
- Compaction testing may be required for fill > 300mm
- Stormwater connection must be to council satisfaction
- Minimum concrete cover over reinforcement as per AS 3600`,
  materialsReference: `
- Ready-mix concrete 20MPa per m³ delivered $200–300; 25MPa $220–330; 32MPa $250–360; 40MPa $290–400
- Concrete pump hire (boom) per job $600–1,400; line pump per job $400–800
- Steel mesh SL72 (6mm wire, 200mm grid) per sheet $55–90; SL82 (8mm wire) per sheet $80–130
- Rebar N12 (12mm) per m $8–15; N16 per m $14–22; bar chairs per 100 $25–50
- Formwork pine 150×25 per m $6–12; 200×25 per m $8–15; form stakes per 10 $15–30
- Form release oil 20L $80–130; plastic vapour barrier per m² $1–3
- Expansion joint foam 10mm per m $12–25; control joint strip per m $8–15
- Concrete sealer 10L $80–150; oxide colour per 10kg $40–80
- Road base (compactable fill) per m³ $50–90; sand per m³ $70–120`,
  formulas: `
- Volume: length × width × depth = m³ (ALWAYS order 5–10% extra — short loads are catastrophic)
- 100mm slab: 1sqm = 0.1m³; so 10sqm = 1m³ of concrete
- 125mm slab: 1sqm = 0.125m³
- Mesh: slab area + 300mm overlap each way; SL72 sheets are 6m × 2.4m = 14.4sqm each
- Formwork: perimeter of slab in linear metres; add corners and step-downs
- Labour estimate: a 3-person crew can pour and finish ~40–60sqm per day (standard broom finish)
- Exposed aggregate: same pour + wash-off next day = extra half-day labour
- Sub-base: 75–100mm compacted road base; area × 0.1m = m³ of base material`,
  gotchas: `
- SHORT POUR is the #1 concreting nightmare — always order 0.5m³ extra minimum
- Concrete waits for no one — once the truck arrives, you have ~90 minutes before it starts setting
- Hot weather (35°C+) halves your working time — may need retarder additive ($50–100)
- Rain on fresh concrete = ruined finish — check 3-day forecast before scheduling
- Pump booking must be confirmed 48hrs ahead — late cancellation fee ~$300
- Expansion joints every 3–4m or the slab WILL crack — never skip this
- Existing underground services must be located and protected — DBYD mandatory
- Disposal of excess concrete / washout is the concreter's responsibility — factor in $50–150`
};

const FENCING: TradeKnowledge = {
  name: "Fencing",
  unitsOfMeasure: `
- Fencing: per linear metre (most common — includes posts, rails, infill, labour)
- Posts: per each (if quoting separately)
- Gates: per each (pedestrian gate vs double driveway gate — very different prices)
- Demolition/removal of old fence: per linear metre
- Retaining component: per linear metre (if fence is also retaining soil)`,
  costDrivers: `
- Fence type: timber paling (cheapest), Colorbond steel, aluminium, pool fencing (glass/aluminium)
- Height: standard 1.8m; pool fence 1.2m; front fence 1.2m; acoustic fence 2.1–2.4m
- Terrain: flat (cheapest), sloping (stepped or raked — adds complexity), rocky ground (post holes)
- Shared boundary: cost may be split 50/50 with neighbour (Fencing Act)
- Number and type of gates
- Demolition and removal of existing fence
- Retaining component if ground levels differ either side`,
  compliance: `
- Fences on shared boundaries subject to Fencing Act (varies by state) — neighbour must be notified
- Pool fencing must comply with AS 1926 — self-closing/self-latching gate, no climbable objects within 900mm
- Front fences may have height restrictions (council planning — typically 1.2m max)
- Heritage overlay areas may restrict fence materials and colours
- Corner allotments often have sightline requirements (900mm max near intersections)
- Building permit may be required for fences over 2m height`,
  materialsReference: `
- Treated pine paling fence per m (1.8m high, supply + install): $150–280
- Colorbond steel fence per m (1.8m high, supply + install): $120–200
- Colorbond gate (single pedestrian): $350–600; double driveway gate: $800–1,800
- Aluminium slat fence per m (1.8m high): $200–400
- Pool fence aluminium per m: $200–350; frameless glass pool fence per m: $500–900
- Timber post 100×100 H4 treated 2.7m: $25–45 each; Colorbond post 50×50: $18–35 each
- Concrete for post footings: premix 20kg bag $8–14 (2–3 bags per post); or $200–300/m³ delivered
- Timber paling 1800×150mm treated: $4–8 each; rails 75×50 per m: $5–10
- Old fence removal + disposal: $15–35 per linear metre`,
  formulas: `
- Posts: total length ÷ 2.4m (post spacing) + 1 = number of posts; add extra for corners and gates
- Palings: total length ÷ 0.15m (paling width) = number of palings (no gap) or ÷ 0.165m (with 15mm gap)
- Rails: 3 rails per bay × number of bays; rail length = post spacing (2.4m)
- Post holes: 600mm deep for 1.8m fence; 800mm deep for soil with poor bearing
- Concrete per post: ~0.02m³ (about 2× 20kg bags of premix)
- Gate: standard pedestrian 900–1000mm wide; double driveway 3.0–3.6m wide
- Labour: experienced fencer can install ~8–12 linear metres per day (post + rail + paling)`,
  gotchas: `
- ALWAYS check boundary pegs / survey before building — wrong placement = tear it down and redo
- Neighbour notification is legally required for shared boundary fences — note in conditions
- Underground services (power, water, NBN) run along boundaries — DBYD before post holes
- Rocky ground = post hole auger won't cut it, need rock breaker (+$200–500/day hire)
- Timber fences need 6–8 weeks drying before staining — advise client
- Sloping sites: "stepped" fence (easier, cheaper) vs "raked" fence (follows slope, premium)
- Colorbond panels are 2.35m between posts — can't adjust spacing easily
- Pool fence installation must be inspected and certified — factor in inspection booking time`
};

const TILING: TradeKnowledge = {
  name: "Tiling",
  unitsOfMeasure: `
- Floor tiles: per square metre (supply + lay, or labour-only)
- Wall tiles: per square metre (typically 10–20% more than floor due to cutting and setting)
- Waterproofing: per square metre (separate line item — critical in wet areas)
- Feature tiles / mosaics: per square metre at premium rate
- Demolition of existing tiles: per square metre
- Trim / edging: per linear metre`,
  costDrivers: `
- Tile size: large format (600×600+) = fewer joints but needs very flat substrate and skilled setter
- Tile material: ceramic (cheapest), porcelain (mid), natural stone (premium, needs sealing)
- Pattern: straight stack (cheapest) < brick bond < herringbone < chevron (most labour-intensive)
- Waterproofing: wet areas (showers, bathrooms) require AS 3740 compliant waterproofing membrane
- Substrate condition: flat and sound = quick; uneven or damaged = levelling compound + extra time
- Demolition of existing tiles adds significant labour + disposal costs
- Heated floor (electric mat under tiles) adds cost + requires electrician`,
  compliance: `
- Wet area waterproofing must comply with AS 3740 (Waterproofing of domestic wet areas)
- Waterproofing membrane must be applied by licensed waterproofer (or tiler with waterproofing licence)
- Shower floor must fall to waste at 1:60 minimum gradient
- Waterproofing must extend: 150mm up walls (full height in shower), full floor area in wet rooms
- Use of approved products only (Ardex, Laticrete, Mapei, etc.)
- Slip resistance ratings apply: R10 minimum for wet area floors (AS 4586)`,
  materialsReference: `
- Standard ceramic floor tile 600×600 (trade) $35–65/sqm; porcelain $50–100/sqm; natural stone $80–200/sqm
- Wall tile 300×600 ceramic $30–70/sqm; subway 100×300 $25–50/sqm; mosaic sheet $50–150/sqm
- Tile adhesive: Ardex X7 20kg $55–80; Davco TTG 20kg $45–70; white adhesive 20kg $50–75
- Grout: sanded 2kg $22–40; unsanded 2kg $20–35; epoxy grout 2kg $55–90
- Waterproof membrane: Ardex WPM 300 per m² $8–15; liquid membrane 10L $80–130; tape 50m $15–30
- Levelling compound: Ardex K301 20kg $65–100; floor leveller 20kg $40–70
- Silicone sealant (wet area) $15–30/tube; tile spacers 3mm per 500 $10–20; tile trim per m $8–18
- Tile cutting blade diamond $30–60; hole saw diamond $20–45`,
  formulas: `
- Tile quantity: measured area + 10% waste (straight lay) or + 15% waste (diagonal/herringbone)
- Adhesive: ~4–5kg per sqm for standard tiles; large format or uneven substrate = 6–8kg/sqm
- Grout: ~0.3–0.5kg per sqm (floor tiles 600×600); 0.5–1kg per sqm (wall tiles 300×600)
- Waterproofing: floor area + wall area to required height; membrane ~1.5L per sqm per coat (2 coats)
- Labour rate: floor tiling 4–6sqm per hour (experienced tiler); wall tiling 3–4sqm per hour
- Bathroom retile (floor + walls, 8–12sqm total): allow 2–3 days with waterproofing
- Kitchen splashback (3–4sqm): allow 1 day including prep and grouting`,
  gotchas: `
- WATERPROOFING is the #1 liability — never cut corners; failed waterproofing = $10,000+ rectification
- Substrate must be flat to ±3mm in 3m — if not, levelling compound is mandatory (add as line item)
- Existing tile removal generates huge amounts of waste — factor in skip bin ($300–500)
- Natural stone needs sealing before AND after grouting — seal is an extra material + labour item
- Large format tiles (600×600+) require back-buttering — doubles adhesive consumption
- Epoxy grout is 3× the cost of cement grout but mandatory in commercial kitchens and wet areas
- Tile is fragile — quote 10% waste minimum, 15% for diagonal patterns
- Heated floor mat must be tested by electrician before tiling over — coordinate trades`
};

const AIR_CON: TradeKnowledge = {
  name: "HVAC / Air Conditioning",
  unitsOfMeasure: `
- Split systems: per unit (supply + install as package — most common residential job)
- Ducted systems: per outlet/zone or per system
- Labour: per hour (for service, repair, diagnostic work)
- Refrigerant: per kg (R32, R410A — needed for regas or new install)
- Ductwork: per linear metre or per outlet
- Electrical: per circuit (dedicated circuit required for each AC unit)`,
  costDrivers: `
- Unit capacity (kW): room size determines required capacity — undersizing is the #1 complaint
- Brand tier: economy (Kelvinator, Hisense) < mid (Daikin FTXF, Samsung) < premium (Mitsubishi MSZ-AP, Daikin US7)
- Installation complexity: back-to-back (cheapest — indoor/outdoor share wall) vs long pipe run (up to 15m)
- Number of storeys (ground floor easiest; second floor needs longer pipe runs, may need cherry picker)
- Electrical: dedicated circuit from switchboard required per unit — may need switchboard upgrade
- Existing vs new: replacement (reuse bracket, pipe route) vs new install (new penetrations, pipe runs, electrical)
- Wifi control module: increasingly expected — $100–200 add-on per unit`,
  compliance: `
- Refrigerant handling requires ARCTick licence (Refrigerant Handling Licence)
- Must comply with AS/NZS 5149 (Refrigerating systems and heat pumps)
- Electrical work must be done by licensed electrician (dedicated circuit, isolator switch)
- Outdoor unit must have adequate clearance (manufacturer specs — typically 300mm sides, 600mm front)
- Noise regulations: outdoor unit placement must comply with local noise ordinances
- Strata/body corporate approval may be required for outdoor unit placement
- F-gas regulations: refrigerant must be recovered, not vented to atmosphere`,
  materialsReference: `
- Split system 2.5kW (Mitsubishi MSZ-AP25 / Daikin FTXF25 trade) $900–1,400
- Split system 3.5kW trade $1,100–1,700; 5.0kW $1,500–2,200; 7.1kW $2,000–3,000; 8.0kW $2,500–3,500
- Economy brand 2.5kW (Kelvinator/Hisense) $600–900; 5.0kW $1,000–1,500
- Installation kit: 5m pipe set + cable + brackets + condensate drain $150–300
- Extra refrigerant pipe per m: $25–50 (copper pair + insulation)
- Wall bracket (heavy duty) $40–80; ground stand $30–60; vibration mounts $10–25 per set
- Condensate pump (if gravity drain not possible) $120–250
- Wifi module (Daikin BRP069C81 / Mitsubishi MAC-568IF-E) $100–200
- Electrical: dedicated circuit + isolator switch $300–600 (done by electrician)`,
  formulas: `
- Room sizing: approx 120–150W per sqm for cooling in average Australian conditions
  → 15sqm bedroom = 2.0–2.5kW; 25sqm living room = 3.5kW; 40sqm open plan = 5.0–6.0kW; 50sqm+ = 7.1kW+
- Adjust up for: north/west facing glass, poor insulation, cathedral ceilings, top floor apartments
- Back-to-back install: 3–4hrs labour for experienced installer
- Standard install (up to 5m pipe run): 4–6hrs labour
- Long pipe run (5–15m): 6–8hrs labour + extra pipe cost + extra refrigerant charge
- Each extra metre of pipe: $25–50 materials + 15min labour
- Service/clean: 1–1.5hrs per split system; $180–350 per unit`,
  gotchas: `
- UNDERSIZING is the most common complaint — always size for worst-case (peak summer/winter day)
- Electrical circuit is a separate trade — coordinate with electrician or quote it yourself if dual-licensed
- Pipe penetration through external wall must be sealed and waterproofed — don't skip the sealant
- Condensate drain must fall to outside — if indoor unit is below external ground level, need a condensate pump
- Strata buildings often restrict outdoor unit placement — check BEFORE quoting
- Older homes may not have capacity in switchboard for dedicated circuit — switchboard upgrade $$
- R32 refrigerant is mildly flammable — additional safety requirements in some installations
- Warranty registration is the installer's responsibility — do it on-site, not later`
};

const ROOFING: TradeKnowledge = {
  name: "Roofing",
  unitsOfMeasure: `
- Roofing sheets: per square metre of roof area or per linear metre of sheet
- Gutters: per linear metre (supply + install)
- Downpipes: per each or per linear metre
- Ridge capping: per linear metre
- Flashing: per linear metre
- Repairs: per each (patch) or per hour (diagnostic + repair)
- Full re-roof: per square metre (includes strip, dispose, re-sheet, flashings)`,
  costDrivers: `
- Roof pitch: low pitch (easiest) vs steep pitch (slow, safety equipment, scaffolding)
- Material: Colorbond (most common), Zincalume (cheapest), tile (heavy, specialist), polycarbonate
- Access: single storey (ladder) vs two-storey (scaffold — $1,000–3,000+)
- Roof condition: simple re-sheet vs rotten battens/rafters needing replacement
- Number of penetrations: skylights, vents, antenna, solar panels = more flashing work
- Valley and hip lines: complex roofs with many valleys/hips = much more flashing and cutting
- Gutter type: quad (standard), fascia, half-round — different price points`,
  compliance: `
- Must comply with AS 1562 (Design and installation of sheet roof and wall cladding)
- Building permit required for full re-roof in most jurisdictions
- Asbestos identification and licensed removal required for pre-1990 roofing
- Fall protection / height safety: harness, anchor points, or edge protection mandatory above 2m
- Stormwater connection: downpipes must connect to council stormwater (not just discharge on ground)
- Wind classification affects fixing pattern — cyclonic regions have specific requirements
- Energy efficiency: sarking/insulation may be required by NCC for new roofing`,
  materialsReference: `
- Colorbond® roofing sheet 0.42 BMT per lm $18–30; 0.48 BMT per lm $24–38
- Zincalume roofing sheet 0.42 BMT per lm $14–24
- Ridge capping Colorbond per lm $15–25; barge capping per lm $12–22; valley flashing per lm $15–28
- Roofing screws hex head 65mm (500pk) $45–80; foam closure strips per m $3–8
- Sarking/underlay (Anticon or Bradford) per m² $4–10; insulation batts R3.5 per m² $12–22
- Gutter Colorbond quad per m $20–35; fascia gutter per m $25–40; half-round per m $30–50
- Downpipe 90mm round per m $15–25; 100×75 square per m $18–30
- Gutter guard per m $20–40 (supply); install $15–25/m labour
- Roof tile (Monier concrete) per m² $40–80; terracotta per m² $60–120
- Butyl flashing tape 75mm per m $5–12; lead flashing per m $25–50`,
  formulas: `
- Roof area: footprint area ÷ cos(pitch angle); or measure plan dimensions + 10% for pitch
  → e.g., 10m × 8m plan = 80sqm footprint; at 22° pitch = 80 ÷ 0.927 = ~86sqm roof area
- Sheet quantity: roof width ÷ cover width (typically 0.762m for corrugated, 0.84m for custom orb)
- Gutter: perimeter of roof where gutters are needed (typically eaves lines only)
- Downpipes: 1 per 12–15m of gutter run; located at corners or near stormwater pit
- Ridge capping: total ridge + hip length
- Re-roofing labour: experienced crew (3 people) can strip and re-sheet ~50–80sqm per day
- Scaffold cost estimate: ~$20–30 per linear metre per lift (per week hire)`,
  gotchas: `
- ASBESTOS: any roof pre-1990 may contain asbestos — must test before disturbing ($50–100 test)
- Asbestos removal by licensed removalist: $50–80/sqm (adds massively to re-roof cost)
- Weather dependency: cannot roof in rain or high wind — build buffer days into schedule
- Existing battens may be rotten or undersized — quote contingency for batten replacement
- Plumbing/electrical penetrations (vents, antennas, solar) need to be removed and reinstated
- Solar panels must be removed and reinstalled by licensed electrician — separate cost + coordination
- Valley irons are the #1 source of roof leaks — always replace during re-roof, don't reuse old ones
- Scaffold hire is per week — efficient scheduling keeps costs down; delays are expensive`
};

/**
 * Maps trade type string to the appropriate trade knowledge object.
 * Matches flexibly on common variations of trade names.
 */
function getTradeKnowledge(tradeType: string): TradeKnowledge | null {
  const t = (tradeType || "").toLowerCase();

  if (t.includes("plumb")) return PLUMBING;
  if (t.includes("electr")) return ELECTRICAL;
  if (t.includes("carp") || t.includes("build")) return CARPENTRY;
  if (t.includes("paint")) return PAINTING;
  if (t.includes("landscape") || t.includes("garden")) return LANDSCAPING;
  if (t.includes("concret")) return CONCRETING;
  if (t.includes("fenc")) return FENCING;
  if (t.includes("tile") || t.includes("tiler")) return TILING;
  if (t.includes("hvac") || t.includes("air")) return AIR_CON;
  if (t.includes("roof")) return ROOFING;

  return null;
}

/**
 * Builds the complete trade-specific context string for the AI system prompt.
 * Includes pricing reference, units, cost drivers, compliance, formulas, and gotchas.
 * Falls back to a general handyman reference if trade type is not recognised.
 */
export function getTradeContext(tradeType: string): string {
  const knowledge = getTradeKnowledge(tradeType);

  if (!knowledge) {
    // General / Handyman fallback
    return `
AUSTRALIAN TRADE PRICING REFERENCE — 2025 market rates:
Labour: Handyman $65–95/hr; specialist trades $100–145/hr
Materials (trade price):
- Fasteners/fixings assorted (lot per job) $20–80; silicone sealant tube $15–30; gap filler tube $12–22
- Plasterboard 10mm (sheet 2400×1200) $20–40; plaster jointing compound 10kg $25–45; cornice per m $5–12
- PVC pipe 50mm per m $8–16; 90mm per m $14–25; PVC elbow $5–15 each
- Timber batten 70×35 per m $4–8; Dynabolts M10 per 10 $18–35; Fischer plugs per 10 $5–15
- Sandpaper assorted (lot) $15–35; mineral turps 1L $15–25; WD-40 $8–18
Sanity checks: TV mounting $150–300; flat-pack assembly $80–200 per item; fence paling replacement $30–80 each installed; door hinge replacement $150–300 per door`;
  }

  return `
AUSTRALIAN ${knowledge.name.toUpperCase()} TRADE KNOWLEDGE BASE — 2025 market rates:

UNITS OF MEASURE for ${knowledge.name}:${knowledge.unitsOfMeasure}

KEY COST DRIVERS:${knowledge.costDrivers}

COMPLIANCE & REGULATORY REQUIREMENTS:${knowledge.compliance}

MATERIALS PRICING REFERENCE (trade/wholesale prices, ex-GST):
${knowledge.materialsReference}

ESTIMATION FORMULAS:${knowledge.formulas}

TRADE-SPECIFIC GOTCHAS — things most AI systems get wrong:${knowledge.gotchas}`;
}
