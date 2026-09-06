# Focusing on the US market first, while based in the EU

**Not legal or tax advice.** The entity/VAT/nexus points below are enough to
reason about the tradeoff and plan next steps, not enough to act on without a
cross-border accountant — get one before registering an entity or deciding
when to handle EU VAT. The stakes (tax authority exposure in two
jurisdictions) are too high to run on a repo doc alone.

## Does it make sense? Partly — the two reasons aren't equally strong

**"EU is filled with bureaucracy for a seller like me right now" — solid,
concrete reason.** EU VAT on digital services (Thido, as software delivered
electronically, is a taxable "digital service") applies **from the first sale
to an EU consumer, with no small-seller threshold** for cross-border
B2C digital services — this is already noted in
[stripe-sandbox-scope.md](./stripe-sandbox-scope.md). Compare that to the US:
sales tax on SaaS is real but triggered by **economic nexus thresholds**
(typically ~$100k revenue or 200 transactions *per state*, the post-*Wayfair*
standard), so a small, pre-revenue product has essentially zero US sales-tax
exposure for a long time, and several states don't tax SaaS at all. That
asymmetry is real and is the stronger half of your reasoning: EU makes you
register before you've made a euro; the US mostly doesn't, until you're
already succeeding there.

One thing worth knowing so it doesn't feel like it fully rules the EU out:
**EU VAT OSS (One-Stop Shop) is one registration and one quarterly return**
covering all 27 member states, not 27 separate registrations — the
bureaucracy is real but front-loaded (the initial registration + ongoing
filing discipline), not an ongoing per-country nightmare. That doesn't
change the "not yet" calculus for a pre-launch product, but it means "defer
the EU" is a timing decision, not a permanent one, and it's less scary
later than "27 registrations" makes it sound.

**"EU users are less likely to try me out at the beginning" — the weaker,
more speculative half.** This isn't obviously true as a blanket claim; European
users try free/beta SaaS products all the time. What *is* generally true and
better-documented: US SaaS buyers show higher measured willingness-to-pay,
the addressable English-language market is larger, and your own build
choices already lean American — the Reddit ads pixel wired into launch
marketing (`src/components/RedditPixel.tsx`), infra hosted in `us-east-1`,
American-English copy throughout. Those are real signals in favor of a
US-first *marketing* focus; they're just a different claim than "Europeans
won't try it," and worth treating as a hypothesis to validate (e.g., watch
signup/paid-conversion split by geography once there's traffic) rather than
an assumption to build the whole plan on.

**Net: yes, this makes sense as a sequencing decision** — build and market
for the US first, defer formal EU commercial compliance — not as a claim
that the EU is a bad market. Two things it does *not* let you skip:

1. **GDPR doesn't care where you're marketing.** It applies based on
   processing EU residents' personal data, not on where you're pointing ad
   spend. If the product isn't geo-blocked, an EU visitor can still sign up
   during your "US-first" phase, and your GDPR obligations (already
   partially built: account data export, account deletion, a privacy page)
   apply to them regardless. "Focusing on the US" is a go-to-market choice;
   it's not the same decision as "excluding EU users," and you haven't built
   a geo-block, so don't assume the two are the same.
2. **If an EU consumer *does* subscribe and pay before you've registered for
   VAT OSS, you're technically non-compliant for that sale**, however small
   the practical enforcement risk at tiny scale. If you want to actually
   avoid that rather than just delay noticing it, the clean options are: (a)
   geo/billing-address-gate EU cards out of Checkout until OSS is sorted, or
   (b) accept the small-scale risk deliberately and register once EU
   interest is real. Both are legitimate; picking neither by default and
   just not thinking about it is the one option to avoid.

## How to target the US market while living in the EU

### 1. Legal/business structure — three real options, roughly in order of effort

- **Do nothing yet.** Sell as an EU-resident individual/sole trader through
  Stripe, priced and settled in USD, payouts converted to your EU bank
  account. No US entity needed to legally sell software to US customers —
  nothing about US law requires the seller to be American. This is the
  lowest-effort option and matches the same "test first, formalize later"
  approach already used for the Stripe sandbox itself
  ([stripe-sandbox-scope.md](./stripe-sandbox-scope.md)). Reasonable default
  while validating demand.
- **Get a US-facing bank presence without a US entity.** Wise Business or
  Payoneer can issue an EU-resident business virtual USD account details
  (ACH routing + account number) so payouts and refunds look and settle like
  a US business, without incorporating. Removes some FX friction; still no
  entity, no US tax filings.
- **Form a US entity (commonly a Delaware or Wyoming LLC) owned by you as a
  non-resident.** Services like Stripe Atlas, Firstbase, or doola exist
  specifically for this. Pros: a ".com"-native business identity, a real US
  bank account, easier if you ever want US-based angels/investors. Cons:
  real, recurring compliance — a foreign-owned single-member LLC must file
  Form 5472 + a pro forma 1120 annually even with zero US income (a
  CPA-assisted filing, real cost every year), plus state franchise fees
  (~$300/year for Delaware). Whether the foreign-owned LLC's income is even
  US-taxable depends on facts (dependent agent, place of management, etc.)
  that a cross-border accountant needs to assess — don't assume "no US tax"
  without that review. This option trades your current low-effort setup for
  real ongoing obligations in exchange for optics and banking convenience;
  it's worth it once there's real revenue, not obviously worth it pre-launch.

### 2. Pricing and currency — this exact fork was already anticipated

Thido Pro is currently priced in EUR (`price_1U9AWIIAJg9i73B6WtwPczxq`,
€12/month). [stripe-pro-plan-draft.md](./stripe-pro-plan-draft.md) explicitly
flagged this fork when the price was set: *"EUR if Thido's legal entity, bank
account, and early customers are in the euro area. USD if the first target
market is primarily the US... Recommendation: EUR unless you already know the
entity/market is US-first."* At the time, EUR was picked by default because
that condition wasn't yet met. It's met now.

Practically: `src/app/billing-actions.ts` and `BillingPanel` currently read a
single `STRIPE_PRO_PRICE_ID` — there's no multi-currency selection logic, so
today it's genuinely one Price for everyone, not "EUR with a USD option
already half-built." That makes the change simpler, not harder: create a USD
Price (e.g. a plain $12 or $15, not a currency-converted €12) and repoint
`STRIPE_PRO_PRICE_ID` at it — no new code needed to switch entirely to USD.
Serving both currencies by visitor locale would be the enhancement on top,
and would need actual code (a Price-by-locale lookup) since nothing like that
exists yet.

### 3. Marketing channels that are already US-leaning (build on what exists)

- Reddit ads are already wired in (`src/components/RedditPixel.tsx`,
  `SignUp` conversion event) — Reddit's user base skews heavily American;
  this is already aligned with a US-first push.
- Product Hunt, Hacker News, and X/indie-hacker communities are US-centric
  and respond well to a founder-led launch story.
- US-timezone content cadence: posting/engaging during US morning-to-evening
  hours (which is EU afternoon-to-late-evening) gets more real-time
  engagement on the above channels than EU-morning posting does.

### 4. Product/positioning details that read as "made for me" to a US buyer

- American English spelling/idioms (already the default throughout the
  product).
- A support contact and at least partial support-hours overlap with US
  business hours — full EU-only support hours read as slow to a US buyer
  used to same-day responses.
- Keep GDPR-grade privacy practices regardless of market focus — strong
  privacy handling is increasingly a *trust signal* to privacy-conscious US
  buyers too, not just an EU-compliance cost, so there's no reason to
  weaken it even while not actively marketing to the EU.

## Suggested sequence

1. Now: sell as EU sole trader in USD via Stripe (option 1 above), no entity
   yet. Add a USD Price alongside the existing EUR one.
2. Focus marketing spend and content on the US-leaning channels already
   wired in, and actually watch signup/conversion-by-geography once there's
   traffic, rather than assuming the EU-adoption-speed hypothesis is true.
3. Revisit VAT OSS registration once EU signups show real paid intent (or
   geo-gate EU billing addresses out of Checkout in the meantime if you want
   to avoid the compliance gap entirely rather than just accept the small-scale risk).
4. Revisit forming a US entity once there's enough US revenue that the
   banking/optics benefit outweighs the annual Form 5472 filing cost and
   effort — talk to a cross-border accountant before doing this, not after.
