import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  funnelEventsTable,
  customersTable,
  productsTable,
  settingsTable,
  experimentsTable,
} from "@workspace/db";
import { sql, eq, desc } from "drizzle-orm";
import { ReplitConnectors } from "@replit/connectors-sdk";

export interface HealthCheck {
  name: string;
  status: "pass" | "warn" | "fail";
  value: string | number;
  detail: string;
}

export interface HealthCategory {
  name: string;
  icon: string;
  score: number;
  checks: HealthCheck[];
}

export interface HealthReport {
  generatedAt: string;
  overallScore: number;
  overallGrade: string;
  categories: HealthCategory[];
}

function categoryScore(checks: HealthCheck[]): number {
  if (checks.length === 0) return 100;
  const total = checks.reduce(
    (sum, c) => sum + (c.status === "pass" ? 100 : c.status === "warn" ? 60 : 0),
    0,
  );
  return Math.round(total / checks.length);
}

function gradeFromScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

export async function runHealthAudit(): Promise<HealthReport> {
  const categories: HealthCategory[] = [];

  // ── 1. Database Health ────────────────────────────────────────────────────
  const dbChecks: HealthCheck[] = [];

  try {
    await db.execute(sql`SELECT 1`);
    dbChecks.push({
      name: "DB Connectivity",
      status: "pass",
      value: "Connected",
      detail: "PostgreSQL (Supabase) connection is healthy",
    });
  } catch (err) {
    dbChecks.push({
      name: "DB Connectivity",
      status: "fail",
      value: "Failed",
      detail: `Connection error: ${String(err)}`,
    });
  }

  try {
    const [ec] = await db.select({ n: sql<number>`count(*)::int` }).from(funnelEventsTable);
    const [cc] = await db.select({ n: sql<number>`count(*)::int` }).from(customersTable);
    const [pc] = await db.select({ n: sql<number>`count(*)::int` }).from(productsTable);
    const [xc] = await db.select({ n: sql<number>`count(*)::int` }).from(experimentsTable);

    const events = ec?.n ?? 0;
    const customers = cc?.n ?? 0;
    const products = pc?.n ?? 0;
    const experiments = xc?.n ?? 0;

    dbChecks.push({ name: "Funnel Events Table", status: events > 0 ? "pass" : "warn", value: events, detail: `${events} events recorded across all sessions` });
    dbChecks.push({ name: "Customers Table", status: customers > 0 ? "pass" : "warn", value: customers, detail: `${customers} customer profiles stored` });
    dbChecks.push({ name: "Products Table", status: products > 0 ? "pass" : "fail", value: products, detail: `${products} products in the campaign catalogue` });
    dbChecks.push({ name: "Experiments Table", status: experiments > 0 ? "pass" : "warn", value: experiments, detail: `${experiments} AI-generated experiments stored` });
  } catch (err) {
    dbChecks.push({ name: "Table Counts", status: "fail", value: "Error", detail: String(err) });
  }

  categories.push({ name: "Database Health", icon: "database", score: categoryScore(dbChecks), checks: dbChecks });

  // ── 2. Data Quality ───────────────────────────────────────────────────────
  const dqChecks: HealthCheck[] = [];

  try {
    const events = await db.select().from(funnelEventsTable);
    const customers = await db.select().from(customersTable);
    const products = await db.select().from(productsTable);

    const nullSessions = events.filter((e) => !e.sessionId).length;
    dqChecks.push({
      name: "Event Session IDs",
      status: nullSessions === 0 ? "pass" : nullSessions < 5 ? "warn" : "fail",
      value: nullSessions === 0 ? "All valid" : `${nullSessions} missing`,
      detail: nullSessions === 0 ? "All events carry valid session identifiers" : `${nullSessions} events are missing sessionId`,
    });

    const customerIds = new Set(customers.map((c) => c.id));
    const orphaned = events.filter((e) => e.customerId != null && !customerIds.has(e.customerId as number)).length;
    dqChecks.push({
      name: "Customer Reference Integrity",
      status: orphaned === 0 ? "pass" : orphaned < 5 ? "warn" : "fail",
      value: orphaned === 0 ? "No orphans" : `${orphaned} orphaned`,
      detail: orphaned === 0 ? "All event customer IDs reference valid customers" : `${orphaned} events reference non-existent customer IDs`,
    });

    const noEmail = customers.filter((c) => !c.email).length;
    dqChecks.push({
      name: "Customer Email Completeness",
      status: noEmail === 0 ? "pass" : "warn",
      value: noEmail === 0 ? "100%" : `${Math.round(((customers.length - noEmail) / customers.length) * 100)}%`,
      detail: noEmail === 0 ? "Every customer has an email address" : `${noEmail} customers are missing email`,
    });

    const brokenSale = products.filter((p) => p.onSale && !p.salePrice).length;
    dqChecks.push({
      name: "Sale Price Integrity",
      status: brokenSale === 0 ? "pass" : "warn",
      value: brokenSale === 0 ? "Clean" : `${brokenSale} broken`,
      detail: brokenSale === 0 ? "All sale products have valid sale prices" : `${brokenSale} products are marked on-sale but have no sale price`,
    });

    const totalPurchases = events.filter((e) => e.eventType === "purchase").length;
    const purchasesNoMeta = events.filter((e) => {
      if (e.eventType !== "purchase") return false;
      try { return !e.metadata || !JSON.parse(e.metadata).total; } catch { return true; }
    }).length;
    dqChecks.push({
      name: "Purchase Metadata",
      status: purchasesNoMeta === 0 ? "pass" : purchasesNoMeta <= 2 ? "warn" : "fail",
      value: totalPurchases > 0 ? `${totalPurchases - purchasesNoMeta}/${totalPurchases}` : "N/A",
      detail: purchasesNoMeta === 0
        ? "All purchase events include order totals and item metadata"
        : `${purchasesNoMeta} of ${totalPurchases} purchases are missing metadata`,
    });

    const sessionCount = new Set(events.map((e) => e.sessionId)).size;
    const identifiedSessions = new Set(
      events.filter((e) => e.customerId != null).map((e) => e.sessionId),
    ).size;
    const identifiedPct = sessionCount > 0 ? Math.round((identifiedSessions / sessionCount) * 100) : 0;
    dqChecks.push({
      name: "Session Attribution Rate",
      status: identifiedPct >= 50 ? "pass" : identifiedPct >= 20 ? "warn" : "fail",
      value: `${identifiedPct}%`,
      detail: `${identifiedSessions} of ${sessionCount} sessions are linked to known customers`,
    });
  } catch (err) {
    dqChecks.push({ name: "Data Quality Check", status: "fail", value: "Error", detail: String(err) });
  }

  categories.push({ name: "Data Quality", icon: "shield-check", score: categoryScore(dqChecks), checks: dqChecks });

  // ── 3. Timely Data Update ─────────────────────────────────────────────────
  const timeChecks: HealthCheck[] = [];

  try {
    const latestEvents = await db
      .select()
      .from(funnelEventsTable)
      .orderBy(desc(funnelEventsTable.createdAt))
      .limit(1);

    const lastEvent = latestEvents[0];
    if (lastEvent) {
      const ageHrs = (Date.now() - new Date(lastEvent.createdAt).getTime()) / 3_600_000;
      timeChecks.push({
        name: "Last Funnel Event",
        status: ageHrs < 48 ? "pass" : ageHrs < 168 ? "warn" : "fail",
        value: ageHrs < 1 ? `${Math.round(ageHrs * 60)}m ago` : `${Math.round(ageHrs)}h ago`,
        detail: `Most recent: ${lastEvent.eventType} at ${new Date(lastEvent.createdAt).toLocaleString()}`,
      });
    } else {
      timeChecks.push({ name: "Last Funnel Event", status: "warn", value: "None", detail: "No events recorded yet" });
    }

    const settings = await db.select().from(settingsTable);
    const settingMap = new Map(settings.map((s) => [s.key, s.value]));

    const syncChecks = [
      { key: "gsheet_last_synced", label: "Funnel Stages Sheet", warnHrs: 25, failHrs: 72 },
      { key: "gsheet_conversion_last_synced", label: "Conversion Rates Sheet", warnHrs: 25, failHrs: 72 },
      { key: "gsheet_customers_last_synced", label: "Customer List Sheet", warnHrs: 25, failHrs: 72 },
      { key: "gsheet_experiments_last_synced", label: "Experiments Sheet", warnHrs: 25, failHrs: 72 },
    ];

    for (const sk of syncChecks) {
      const val = settingMap.get(sk.key);
      if (val) {
        const ageHrs = (Date.now() - new Date(val).getTime()) / 3_600_000;
        timeChecks.push({
          name: `${sk.label} Sync`,
          status: ageHrs < sk.warnHrs ? "pass" : ageHrs < sk.failHrs ? "warn" : "fail",
          value: ageHrs < 1 ? `${Math.round(ageHrs * 60)}m ago` : `${Math.round(ageHrs)}h ago`,
          detail: `Last synced: ${new Date(val).toLocaleString()}`,
        });
      } else {
        timeChecks.push({ name: `${sk.label} Sync`, status: "warn", value: "Never", detail: "Sheet has not been synced yet — trigger a sync from the Dashboard" });
      }
    }

    const latestExp = await db
      .select()
      .from(experimentsTable)
      .orderBy(desc(experimentsTable.createdAt))
      .limit(1);
    const lastExp = latestExp[0];
    if (lastExp) {
      const ageHrs = (Date.now() - new Date(lastExp.createdAt).getTime()) / 3_600_000;
      timeChecks.push({
        name: "Last AI Diagnosis",
        status: ageHrs < 72 ? "pass" : ageHrs < 168 ? "warn" : "fail",
        value: ageHrs < 1 ? `${Math.round(ageHrs * 60)}m ago` : `${Math.round(ageHrs)}h ago`,
        detail: `"${lastExp.title}" — ${new Date(lastExp.createdAt).toLocaleString()}`,
      });
    } else {
      timeChecks.push({ name: "Last AI Diagnosis", status: "warn", value: "None", detail: "No AI diagnoses run yet" });
    }
  } catch (err) {
    timeChecks.push({ name: "Timely Data Check", status: "fail", value: "Error", detail: String(err) });
  }

  categories.push({ name: "Timely Data Update", icon: "clock", score: categoryScore(timeChecks), checks: timeChecks });

  // ── 4. API Integration ────────────────────────────────────────────────────
  const apiChecks: HealthCheck[] = [];
  const port = process.env["PORT"] ?? "8080";
  const baseUrl = `http://localhost:${port}/api`;

  const endpoints = [
    { name: "Core Health Check", path: "/healthz" },
    { name: "Funnel Summary API", path: "/analytics/funnel-summary" },
    { name: "Campaign Metrics API", path: "/analytics/campaign-metrics" },
    { name: "Traffic Analytics API", path: "/analytics/traffic" },
    { name: "Drop-off Analysis API", path: "/analytics/drop-off" },
    { name: "AI Experiments API", path: "/ai/experiments" },
    { name: "Customer Trends API", path: "/analytics/customer-trends" },
    { name: "Sheet Info API", path: "/analytics/sheet-info" },
  ];

  for (const ep of endpoints) {
    try {
      const start = Date.now();
      const resp = await fetch(`${baseUrl}${ep.path}`, {
        signal: AbortSignal.timeout(5000),
      });
      const ms = Date.now() - start;
      apiChecks.push({
        name: ep.name,
        status: resp.ok ? (ms < 2000 ? "pass" : "warn") : "fail",
        value: `HTTP ${resp.status} · ${ms}ms`,
        detail: resp.ok ? `Responded successfully in ${ms}ms` : `Unexpected status ${resp.status}`,
      });
    } catch (err) {
      apiChecks.push({
        name: ep.name,
        status: "fail",
        value: "Unreachable",
        detail: `Error: ${String(err).slice(0, 100)}`,
      });
    }
  }

  try {
    const cached = await db.select().from(settingsTable).where(eq(settingsTable.key, "gsheet_spreadsheet_id"));
    if (cached.length && cached[0]) {
      const spreadsheetId = cached[0].value;
      const connectors = new ReplitConnectors();
      const resp = await connectors.proxy(
        "google-sheet",
        `/v4/spreadsheets/${spreadsheetId}?fields=spreadsheetId`,
        { method: "GET" },
      );
      const data = (await resp.json()) as { spreadsheetId?: string; error?: { message: string } };
      if (data.spreadsheetId) {
        apiChecks.push({ name: "Google Sheets Integration", status: "pass", value: "Accessible", detail: `Spreadsheet ${spreadsheetId} is reachable via Replit connector` });
      } else {
        apiChecks.push({ name: "Google Sheets Integration", status: "fail", value: "Inaccessible", detail: data.error?.message ?? "Spreadsheet returned an error" });
      }
    } else {
      apiChecks.push({ name: "Google Sheets Integration", status: "warn", value: "Not synced", detail: "No spreadsheet ID stored yet — sync from the Dashboard first" });
    }
  } catch (err) {
    apiChecks.push({ name: "Google Sheets Integration", status: "fail", value: "Error", detail: String(err) });
  }

  categories.push({ name: "API Integration", icon: "plug", score: categoryScore(apiChecks), checks: apiChecks });

  // ── 5. AI Health ──────────────────────────────────────────────────────────
  const aiChecks: HealthCheck[] = [];

  const hasBaseUrl = !!process.env["AI_INTEGRATIONS_OPENAI_BASE_URL"];
  const hasApiKey = !!process.env["AI_INTEGRATIONS_OPENAI_API_KEY"];
  aiChecks.push({
    name: "OpenAI Credentials",
    status: hasBaseUrl && hasApiKey ? "pass" : hasBaseUrl || hasApiKey ? "warn" : "fail",
    value: hasBaseUrl && hasApiKey ? "Configured" : "Incomplete",
    detail: hasBaseUrl && hasApiKey
      ? "Both OPENAI_BASE_URL and OPENAI_API_KEY are present"
      : `Missing: ${[!hasBaseUrl && "AI_INTEGRATIONS_OPENAI_BASE_URL", !hasApiKey && "AI_INTEGRATIONS_OPENAI_API_KEY"].filter(Boolean).join(", ")}`,
  });

  try {
    const experiments = await db.select().from(experimentsTable);
    const count = experiments.length;

    aiChecks.push({
      name: "Experiment Volume",
      status: count >= 10 ? "pass" : count >= 3 ? "warn" : "fail",
      value: count,
      detail: count >= 10 ? `${count} experiments — strong AI utilisation` : count >= 3 ? `${count} experiments — consider running more diagnoses` : `Only ${count} experiments generated so far`,
    });

    const stages = new Set(experiments.map((e) => e.funnelStage).filter(Boolean));
    aiChecks.push({
      name: "Funnel Stage Coverage",
      status: stages.size >= 4 ? "pass" : stages.size >= 2 ? "warn" : "fail",
      value: `${stages.size} stage${stages.size !== 1 ? "s" : ""}`,
      detail: stages.size > 0
        ? `Diagnosed stages: ${[...stages].join(", ")}`
        : "No funnel stages have been diagnosed yet",
    });

    const running = experiments.filter((e) => e.status === "running").length;
    const completed = experiments.filter((e) => e.status === "completed").length;
    const proposed = experiments.filter((e) => e.status === "proposed").length;
    aiChecks.push({
      name: "Experiment Utilisation",
      status: running > 0 || completed > 0 ? "pass" : proposed > 0 ? "warn" : "fail",
      value: running > 0 ? `${running} active` : completed > 0 ? `${completed} completed` : `${proposed} proposed`,
      detail: `${proposed} proposed · ${running} running · ${completed} completed`,
    });

    const highEffort = experiments.filter((e) => e.effort === "high").length;
    const lowEffort = experiments.filter((e) => e.effort === "low").length;
    aiChecks.push({
      name: "Effort Mix",
      status: lowEffort > 0 && highEffort > 0 ? "pass" : "warn",
      value: `${lowEffort}L / ${experiments.filter(e => e.effort === "medium").length}M / ${highEffort}H`,
      detail: `Low-effort: ${lowEffort} · Medium: ${experiments.filter(e => e.effort === "medium").length} · High-effort: ${highEffort}`,
    });
  } catch (err) {
    aiChecks.push({ name: "AI Experiments Check", status: "fail", value: "Error", detail: String(err) });
  }

  categories.push({ name: "AI Health", icon: "brain", score: categoryScore(aiChecks), checks: aiChecks });

  const overallScore = Math.round(
    categories.reduce((sum, c) => sum + c.score, 0) / categories.length,
  );

  return {
    generatedAt: new Date().toISOString(),
    overallScore,
    overallGrade: gradeFromScore(overallScore),
    categories,
  };
}

const router: IRouter = Router();

router.get("/health/audit", async (req, res): Promise<void> => {
  try {
    const cached = await db
      .select()
      .from(settingsTable)
      .where(eq(settingsTable.key, "health_report"));

    if (cached.length && cached[0]) {
      res.json(JSON.parse(cached[0].value) as HealthReport);
      return;
    }

    const report = await runHealthAudit();
    await db
      .insert(settingsTable)
      .values({ key: "health_report", value: JSON.stringify(report) })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: JSON.stringify(report), updatedAt: new Date() } });

    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Health audit GET failed");
    res.status(500).json({ error: "Health audit failed" });
  }
});

router.post("/health/audit", async (req, res): Promise<void> => {
  try {
    const report = await runHealthAudit();
    await db
      .insert(settingsTable)
      .values({ key: "health_report", value: JSON.stringify(report) })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: JSON.stringify(report), updatedAt: new Date() } });

    res.json(report);
  } catch (err) {
    req.log.error({ err }, "Health audit forced run failed");
    res.status(500).json({ error: "Health audit failed" });
  }
});

export default router;
