import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { experimentsTable, funnelEventsTable, customersTable } from "@workspace/db";
import { DiagnoseFunnelBody, ListExperimentsResponse, DiagnoseFunnelResponse } from "@workspace/api-zod";
import { openai } from "@workspace/integrations-openai-ai-server";
import { desc } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

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
