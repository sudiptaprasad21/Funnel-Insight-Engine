import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, funnelEventsTable, customersTable } from "@workspace/db";
import { DiagnoseFunnelBody, ListExperimentsResponse, DiagnoseFunnelResponse, AnalyzeDropOffResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// ─── AI Drop-off Analysis ─────────────────────────────────────────────────────
router.post("/ai/analyze-drop-off", async (req, res): Promise<void> => {
  const events = await db.select().from(funnelEventsTable);
  const customers = await db.select().from(customersTable);

  const sessionSet = (types: string[]) =>
    new Set(events.filter((e) => types.includes(e.eventType)).map((e) => e.sessionId)).size;

  const totalSessions   = new Set(events.map((e) => e.sessionId)).size;
  const bannerClicks    = sessionSet(["banner_click"]);
  const productViews    = sessionSet(["product_view", "sale_item_view", "browse_only"]);
  const detailViews     = sessionSet(["product_detail_view"]);
  const subIntents      = sessionSet(["intended_subscription"]);
  const wishlistSaves   = sessionSet(["add_to_wishlist"]);
  const cartAdds        = sessionSet(["add_to_cart", "wishlist_to_cart"]);
  const checkouts       = sessionSet(["checkout_start"]);
  const purchases       = sessionSet(["purchase"]);
  const subscribed      = sessionSet(["subscribed"]);
  const cartAbandons    = events.filter((e) => e.eventType === "cart_abandon").length;
  const browseOnly      = sessionSet(["browse_only"]);
  const repeatCustomers = customers.filter((c) => c.isRepeat).length;
  const activeSubscribers = customers.filter((c) => c.isSubscribed).length;

  const stages = [
    { stage: "Landing Page View",   users: totalSessions, dropOff: 0, dropOffRate: 0 },
    { stage: "Banner Click",        users: bannerClicks,  dropOff: 0, dropOffRate: 0 },
    { stage: "Product View",        users: productViews,  dropOff: 0, dropOffRate: 0 },
    { stage: "Product Detail View", users: detailViews,   dropOff: 0, dropOffRate: 0 },
    { stage: "Subscription Intent", users: subIntents,    dropOff: 0, dropOffRate: 0 },
    { stage: "Wishlist Save",       users: wishlistSaves, dropOff: 0, dropOffRate: 0 },
    { stage: "Add to Cart",         users: cartAdds,      dropOff: 0, dropOffRate: 0 },
    { stage: "Checkout",            users: checkouts,     dropOff: 0, dropOffRate: 0 },
    { stage: "Purchased",           users: purchases,     dropOff: 0, dropOffRate: 0 },
    { stage: "Subscribed",          users: subscribed,    dropOff: 0, dropOffRate: 0 },
  ];

  for (let i = 0; i < stages.length - 1; i++) {
    const raw = stages[i].users - stages[i + 1].users;
    stages[i].dropOff = Math.max(0, raw);
    stages[i].dropOffRate = stages[i].users > 0
      ? parseFloat(((stages[i].dropOff / stages[i].users) * 100).toFixed(1))
      : 0;
  }

  const topDropOffStage =
    stages.slice(0, -1).sort((a, b) => b.dropOff - a.dropOff)[0]?.stage ?? "Banner Click";

  const stageLines = stages
    .map((s) => `  • ${s.stage}: ${s.users} sessions${s.dropOff > 0 ? ` — ${s.dropOff} dropped off (${s.dropOffRate}%)` : ""}`)
    .join("\n");

  const systemPrompt = `You are Nexpoint Funnel IQ, an AI-powered growth analytics engine for e-commerce funnels.

You receive real funnel stage data and produce precise, data-backed drop-off analysis. You are a senior growth analyst — concise, specific, and always tied to the numbers.

Never be vague. Never invent data. Tie every reason and hypothesis directly to the numbers provided.`;

  const userPrompt = `Analyze the Mother's Day campaign funnel drop-off and return structured output.

## Real Funnel Data
Total unique sessions: ${totalSessions}
Cart abandons: ${cartAbandons}
Browse-only sessions (no cart/sub): ${browseOnly}
Repeat customers: ${repeatCustomers} of ${customers.length}
Active subscribers: ${activeSubscribers}

## Stage-by-Stage Breakdown
${stageLines}

## Top Drop-off Stage (highest absolute drop)
${topDropOffStage}

## Instructions
Return a JSON object with exactly this structure — no extra keys, no markdown:
{
  "topDropOffStage": "${topDropOffStage}",
  "dropOffReasons": [
    {
      "reason": "Short, specific reason tied to the data",
      "likelihood": "high|medium|low",
      "stage": "The stage name this reason applies to"
    }
  ],
  "hypotheses": [
    {
      "hypothesis": "If we [specific change], then [specific metric] will [direction] because [mechanism]",
      "rationale": "1-2 sentences grounding this in the numbers above",
      "stage": "The stage this hypothesis targets"
    }
  ],
  "suggestedExperiment": {
    "title": "Short experiment name",
    "hypothesis": "If we [change], then [metric] will [improve] because [reason]",
    "expectedImpact": "e.g. +15% checkout completion rate",
    "effort": "low|medium|high"
  },
  "generatedAt": "${new Date().toISOString()}"
}

Provide 4–6 drop-off reasons (covering the highest-loss stages), exactly 3 hypotheses, and 1 best-bet experiment. Be specific and data-backed.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed_result = JSON.parse(raw);

    res.json(AnalyzeDropOffResponse.parse({
      topDropOffStage: parsed_result.topDropOffStage ?? topDropOffStage,
      dropOffReasons: parsed_result.dropOffReasons ?? [],
      hypotheses: parsed_result.hypotheses ?? [],
      suggestedExperiment: parsed_result.suggestedExperiment ?? {
        title: "Reduce checkout friction",
        hypothesis: "If we simplify the checkout flow, then purchase completion will increase because fewer steps reduces abandonment.",
        expectedImpact: "+10% checkout completion",
        effort: "medium",
      },
      generatedAt: new Date().toISOString(),
    }));
  } catch (err) {
    req.log.error({ err }, "AI drop-off analysis failed");
    // Deterministic fallback
    const bannerCTRPct = totalSessions > 0 ? ((bannerClicks / totalSessions) * 100).toFixed(1) : "0";
    const checkoutDropPct = checkouts > 0 ? (((checkouts - purchases) / checkouts) * 100).toFixed(1) : "0";
    res.json({
      topDropOffStage,
      dropOffReasons: [
        { reason: `Only ${bannerCTRPct}% of sessions clicked the campaign banner — low initial engagement`, likelihood: "high", stage: "Banner Click" },
        { reason: `${browseOnly} sessions browsed products without adding to cart — price or relevance friction`, likelihood: "high", stage: "Product View" },
        { reason: `${checkoutDropPct}% of checkout starters did not complete purchase — payment or UX friction`, likelihood: "high", stage: "Checkout" },
        { reason: "Users added items to wishlist but didn't convert to cart — intent without urgency", likelihood: "medium", stage: "Wishlist Save" },
        { reason: "Cart abandon rate suggests price sensitivity or unexpected costs at checkout", likelihood: "medium", stage: "Add to Cart" },
      ],
      hypotheses: [
        {
          hypothesis: `If we add urgency cues (countdown + low-stock signals) to the banner, banner CTR will increase from ${bannerCTRPct}% because scarcity drives action`,
          rationale: `Only ${bannerClicks} of ${totalSessions} sessions clicked the hero banner. A time-bound offer with Mother's Day countdown would increase engagement.`,
          stage: "Banner Click",
        },
        {
          hypothesis: "If we show real-time social proof (\"23 people viewing this\") on product cards, add-to-cart rate will increase because it reduces purchase hesitation",
          rationale: `${browseOnly} sessions viewed products without adding to cart. Social proof lowers friction at the product consideration stage.`,
          stage: "Product View",
        },
        {
          hypothesis: `If we reduce checkout to a single page with autofill, checkout completion will increase because ${checkoutDropPct}% of starters currently abandon`,
          rationale: `${checkouts} sessions started checkout but only ${purchases} completed. Multi-step friction is the most likely cause at this drop-off rate.`,
          stage: "Checkout",
        },
      ],
      suggestedExperiment: {
        title: "One-Click Checkout with Order Summary",
        hypothesis: `If we consolidate checkout into a single step with an order summary visible throughout, purchase completion will increase by 15–20% because ${checkoutDropPct}% of starters currently abandon`,
        expectedImpact: `+${Math.min(20, Math.round(parseFloat(checkoutDropPct) * 0.4))}% checkout completion rate`,
        effort: "medium",
      },
      generatedAt: new Date().toISOString(),
    });
  }
});

// ─── List Experiments ─────────────────────────────────────────────────────────
router.get("/ai/experiments", async (req, res): Promise<void> => {
  const experiments = await db
    .select()
    .from(experimentsTable)
    .orderBy(desc(experimentsTable.createdAt));

  res.json(ListExperimentsResponse.parse(experiments));
});

// ─── AI Funnel Diagnosis ──────────────────────────────────────────────────────
router.post("/ai/diagnose", async (req, res): Promise<void> => {
  const parsed = DiagnoseFunnelBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { funnelStage, additionalContext } = parsed.data;

  // Gather real data context
  const events = await db.select().from(funnelEventsTable);
  const customers = await db.select().from(customersTable);

  const sessions = new Set(events.map((e) => e.sessionId)).size;
  const bannerClicks = events.filter((e) => e.eventType === "banner_click").length;
  const addToCart = events.filter((e) => e.eventType === "add_to_cart").length;
  const purchases = events.filter((e) => e.eventType === "purchase").length;
  const nappySubs = events.filter((e) => e.eventType === "nappy_subscription_click").length;
  const browseOnly = events.filter((e) => e.eventType === "browse_only").length;
  const checkouts = events.filter((e) => e.eventType === "checkout_start").length;
  const repeatCustomers = customers.filter((c) => c.isRepeat).length;
  const subscribers = customers.filter((c) => c.isSubscribed).length;

  const bannerCTR = sessions > 0 ? ((bannerClicks / sessions) * 100).toFixed(1) : "N/A";
  const cartRate = sessions > 0 ? ((addToCart / sessions) * 100).toFixed(1) : "N/A";
  const conversionRate = sessions > 0 ? ((purchases / sessions) * 100).toFixed(1) : "N/A";
  const checkoutDropOff = checkouts > 0 ? (((checkouts - purchases) / checkouts) * 100).toFixed(1) : "N/A";

  const systemPrompt = `You are Nexpoint Funnel IQ — an AI-powered marketing funnel drop-off diagnosis engine for e-commerce growth managers. 

You analyze real funnel data and produce clear, actionable diagnoses and A/B experiment suggestions. You are data-driven, concise, and direct. You speak like a senior growth analyst, not a chatbot.

Never be vague. Always tie insights directly to the numbers provided. Suggest specific, testable experiments.`;

  const userPrompt = `Diagnose the "${funnelStage}" stage of the Happy Mom Mother's Day campaign funnel.

## Real Funnel Data
- Total unique sessions: ${sessions}
- Banner clicks: ${bannerClicks} (CTR: ${bannerCTR}%)
- Add to cart: ${addToCart} (rate: ${cartRate}%)
- Checkout starts: ${checkouts}
- Purchases: ${purchases} (conversion: ${conversionRate}%)
- Checkout drop-off: ${checkoutDropOff}%
- Browse-only sessions: ${browseOnly}
- Nappy subscription clicks: ${nappySubs}
- Repeat customers: ${repeatCustomers} of ${customers.length} total
- Active subscribers: ${subscribers}

${additionalContext ? `Additional context from growth manager: ${additionalContext}` : ""}

## Instructions
Return a JSON object with exactly this structure:
{
  "summary": "2-3 sentence executive summary of the funnel health at this stage",
  "topInsights": [
    {
      "title": "Short title",
      "description": "Specific insight tied to the data",
      "severity": "low|medium|high|critical"
    }
  ],
  "experiments": [
    {
      "title": "Experiment name",
      "hypothesis": "If we [change], then [metric] will [improve] because [reason]",
      "expectedImpact": "e.g. +12% checkout completion",
      "effort": "low|medium|high",
      "funnelStage": "${funnelStage}"
    }
  ]
}

Provide 3-5 insights and 3-4 experiments. Be specific, data-backed, and actionable.`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-5.2",
      max_completion_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      response_format: { type: "json_object" },
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const parsed_result = JSON.parse(raw);

    // Save experiments to DB
    const experimentRows = (parsed_result.experiments ?? []).map(
      (exp: { title: string; hypothesis: string; expectedImpact: string; effort: string; funnelStage: string }) => ({
        title: exp.title,
        hypothesis: exp.hypothesis,
        expectedImpact: exp.expectedImpact,
        effort: exp.effort ?? "medium",
        funnelStage: exp.funnelStage ?? funnelStage,
        status: "proposed",
      }),
    );

    const savedExperiments = experimentRows.length > 0
      ? await db.insert(experimentsTable).values(experimentRows).returning()
      : [];

    const result = {
      summary: parsed_result.summary ?? "Analysis complete.",
      topInsights: parsed_result.topInsights ?? [],
      experiments: savedExperiments,
      generatedAt: new Date().toISOString(),
    };

    res.json(DiagnoseFunnelResponse.parse(result));
  } catch (err) {
    req.log.error({ err }, "AI diagnosis failed");
    // Fallback deterministic response
    const fallbackExperiments = await db.select().from(experimentsTable).orderBy(desc(experimentsTable.createdAt)).limit(3);
    res.json({
      summary: `The ${funnelStage} stage shows clear drop-off patterns. Based on current data, the conversion rate is ${conversionRate}% with a checkout abandonment of ${checkoutDropOff}%. Priority actions focus on reducing friction at key decision points.`,
      topInsights: [
        {
          title: "High Browse-Only Rate",
          description: `${browseOnly} sessions browsed without adding to cart — ${sessions > 0 ? ((browseOnly / sessions) * 100).toFixed(0) : 0}% of visitors. Campaign messaging may not be compelling enough.`,
          severity: "high",
        },
        {
          title: "Banner CTR Below Target",
          description: `Mother's Day banner achieved ${bannerCTR}% CTR. Industry benchmark for seasonal campaigns is 8-12%.`,
          severity: "medium",
        },
        {
          title: "Checkout Drop-Off",
          description: `${checkoutDropOff}% of users who started checkout did not complete purchase. Friction in the payment flow is likely.`,
          severity: "critical",
        },
      ],
      experiments: fallbackExperiments,
      generatedAt: new Date().toISOString(),
    });
  }
});

export default router;
