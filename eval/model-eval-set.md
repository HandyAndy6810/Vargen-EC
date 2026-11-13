# Vargen model test set (draft 2, 13 Nov 2026)

> Machine-readable version: [`jobs.json`](jobs.json). The runner and scoring are described in [`README.md`](README.md).

## What this is for

Run each job description through each candidate model, using the same prompt, templates and price list, and score the output. The goal is to see which model reads jobs best. The scores don't measure prices, because prices come from the price list, not the model.

**Status:** the expected answers check **structure** (the right trades, the right items and the right questions), not exact figures. Expected hours are left out on purpose, because nobody has given us real ones. Hours are scored on whether they make sense, not against a target number.

**Two tiers of items:**
- **Must have**: only items any quote for that job obviously needs (no concrete on a slab quote, or no turf on a turf quote, is a fail). These are scored pass or fail.
- **Should have**: the detail items (chairs, joints, bearers and so on). These are **logged and compared between models, not scored pass or fail**, because nobody in the loop can confirm them yet. Tradie edits after launch are the real check on them.

The test compares models against each other on the same yardstick, so an imperfect "should have" list doesn't skew the result.

## How to score each run

| Check | Pass when | Weight |
|---|---|---|
| Must have items | every listed item is present | High |
| Should have items | count how many are present (logged, compared between models, not pass or fail) | Logged |
| Must not | nothing from the "must not" list appears | High |
| Trades | correct trades, none missing, none invented | High |
| Facts pulled out | the dimensions and quantities in the text are captured exactly | High |
| Questions: skip | doesn't ask anything the text already answers | Medium |
| Questions: key one | asks the listed key question (if any), and no more than 3 in total | Medium |
| No invented prices | every price is from the price list or labelled "estimate, check this" | Fail if broken |
| No compliance claims | never says "complies with" a standard; uses the "by others" flags | Fail if broken |
| Hours make sense | given as crew × time, labelled an estimate, and bigger jobs get more hours (see the paired cases) | Medium |
| Cost and speed | cents per quote and seconds to first draft | Record only |

## The jobs

### Concreting

**C1. Detailed driveway** (should ask nothing)
> 6m x 4m driveway, 100mm thick, SL72, old concrete needs to come out, broom finish, easy truck access
- Facts: 24 m², 100 mm, SL72, removal yes, broom
- Must have: premix, mesh, formwork, removal of the old concrete, disposal / tip
- Should have: road base, bar chairs, expansion joint, saw cuts
- Must not: pump hire (access is easy), any questions
- Key question: none

**C2. Vague driveway**
> can you quote a driveway at my mums place
- Must have: asks for the size before quoting
- Must not: a quote with made up dimensions shown as facts
- Key question: rough size (length × width), then whether old concrete comes out

**C3. Patio with tight access**
> back patio slab 5 x 3, only access is a side gate about 900 wide, customer wants exposed aggregate
- Facts: 15 m², exposed aggregate
- Must have: premix, a pump or barrow line (because of the access), the exposed aggregate finish
- Should have: formwork, mesh, chairs
- Key question: none needed (thickness falls back to the default and shows as an assumption)

**C4 and C5. Paired paths** (the hours scaling test)
> C4: concrete path down the side of the house, 15m long 1.2m wide
> C5: concrete path around the whole house, 45m long 1.2m wide
- Facts: 18 m² and 54 m²
- Must have: premix, formwork
- Should have: expansion joints (C5 needs more than C4), saw cuts
- Pass: C5's labour is clearly more than C4's, but not just a blind 3× (setup time doesn't triple)

**C6. Granny flat slab** (engineering flag)
> slab for a granny flat 8 x 6
- Must have: the "Engineering by others" flag, and a request for the engineer's figures
- Must not: edge beam or footing sizes presented as fact
- Key question: do they have the engineer's drawings

### Plumbing

**P1. Tap swap, customer supplies the tap**
> replace leaking kitchen mixer tap, customer is supplying the tap
- Must have: labour / service fee, small fittings
- Must not: a tap as a material line
- Key question: none

**P2. Hot water swap**
> hot water system died, 250L electric, like for like swap, it's in an upstairs cupboard
- Must have: a 250 L electric unit, removal and disposal of the old unit
- Should have: valves and fittings, a note about the access difficulty
- Key question: none needed (it may confirm the brand or power supply, but that's optional)

**P3. Blocked toilet** (service call)
> blocked toilet
- Must have: the service call template (call out plus time)
- Must not: a new toilet
- Key question: is it just the one toilet, or are other drains slow too

### Electrical

**E1. Downlights**
> install 8 LED downlights in the lounge replacing old halogens, single storey, roof access fine
- Facts: 8 downlights
- Must have: 8 downlights, labour
- Should have: disposal of the old fittings
- Key question: none

**E2. Switchboard upgrade**
> switchboard upgrade, still has old ceramic fuses
- Must have: a new board, circuit protection devices, and a "possible asbestos in old board, check before work" flag
- Key question: roughly how many circuits, or is the house single or double storey

### Fencing

**F1. Colorbond replacing paling**
> 30m colorbond fence 1.8 high, replacing old paling, shared with the neighbour
- Facts: 30 m, 1.8 m high, removal yes
- Must have: fence panels / sheets, posts, removal and disposal of the old paling
- Should have: rails, post concrete, a note about splitting the cost with the neighbour
- Key question: who's paying (the customer only, or split with the neighbour)

### Landscaping

**L1. Turf**
> lay 50m2 of turf in the back yard, old grass needs removing
- Facts: 50 m², removal yes
- Must have: turf, removal of the old grass
- Should have: soil prep / underlay, disposal
- Key question: none needed (the turf type falls back to a default and shows as an assumption)

### Carpentry

**K1. Deck**
> hardwood deck 4 x 5 off the back door, about 600 off the ground
- Facts: 20 m², about 600 mm high
- Must have: decking boards, posts or footings, the frame (bearers and joists, or a frame line)
- Should have: fixings
- Key question: does it need steps or a balustrade

### Handyman

**H1. Small jobs list**
> hang 3 pictures, fix a sticking door, replace 2 cabinet hinges
- Must have: three separate tasks, hinges as a material, hourly or fixed labour
- Must not: any questions

### Mixed trades

**M1. Bathroom reno**
> small bathroom about 2 x 2.5, gut it, new vanity toilet and shower, tiles floor to ceiling
- Trades: demolition, plumbing, waterproofing, tiling, electrical (scored as should have), carpentry as needed (should have)
- Must have: demolition and disposal, waterproofing, tiling (walls and floor), plumbing
- Should have: electrical (fan and lights), an allowance line for fixtures
- Key question: who's supplying the fixtures and tiles

**M2. Outdoor area**
> outdoor area, patio slab 6 x 4, 2 outdoor lights and a powerpoint
- Trades: concreting and electrical
- Must have: the slab items, 2 outdoor lights, 1 weatherproof GPO
- Key question: none

**M3. New laundry in the garage**
> want a new laundry put in the garage
- Trades: plumbing (water and drainage), electrical, carpentry / cabinetry
- Key question: is there water and drainage nearby, and what's included (tub, cabinets)

### Edge cases

**X1. Not a job**
> hi
- Pass: asks what the job is
- Must not: any quote

**X2. Typos, two trades**
> need 3 dwnlights put in and fix leeky tap in kitchn
- Trades: electrical and plumbing
- Facts: 3 downlights, 1 tap repair
- Must have: both jobs

## Before running it

- Each run uses the same templates and the same price list (dev database), so only the model changes.
- Run each job 3 times per model, to see whether it's consistent.
