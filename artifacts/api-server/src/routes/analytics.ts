import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  funnelEventsTable,
  customersTable,
  productsTable,
  settingsTable,
  experimentsTable,
} from "@workspace/db";
import { sql, count, avg, eq, desc } from "drizzle-orm";
import { createSpreadsheet, clearAndWriteSheet, clearAndWriteNamedSheet, ensureSheetTab, sheetUrl } from "../lib/gsheets";

const router: IRouter = Router();

// ─── Funnel Summary ───────────────────────────────────────────────────────────
router.get("/analytics/funnel-summary", async (req, res): Promise<void> => {
  const events = await db.select().from(funnelEventsTable);

  const countByType = (type: string) =>
    events.filter((e) => e.eventType === type).length;

  const totalVisitors = new Set(events.map((e) => e.sessionId)).size;
  const bannerClicks = countByType("banner_click");
  // product_view = section scroll into view; sale_item_view + browse_only = individual card clicks
  const productViews = countByType("product_view") + countByType("sale_item_view") + countByType("browse_only");
  const saleItemViews = countByType("sale_item_view");
  const browseOnlyCount = countByType("browse_only");
  const addToCart = countByType("add_to_cart") + countByType("wishlist_to_cart");
  const addToWishlist = countByType("add_to_wishlist");
  const removeFromWishlist = countByType("remove_from_wishlist");
  const wishlistToCart = countByType("wishlist_to_cart");
  const productDetailViews = countByType("product_detail_view");
  const nappySubscriptions = countByType("nappy_subscription_click");
  const intendedSubscriptions = countByType("intended_subscription");
  const subscriptions = countByType("subscribed");
  const cartAbandons = countByType("cart_abandon");
  const checkoutStarts = countByType("checkout_start");
  const purchases = countByType("purchase");

  const bannerCTR =
    totalVisitors > 0
      ? parseFloat((bannerClicks / totalVisitors).toFixed(3))
      : 0;
  const conversions = purchases + subscriptions;
  const conversionRate =
    totalVisitors > 0
      ? parseFloat((conversions / totalVisitors).toFixed(3))
      : 0;
  const cartAbandonRate =
    addToCart > 0
      ? parseFloat((cartAbandons / addToCart).toFixed(3))
      : 0;

  const customers = await db.select().from(customersTable);
  const repeatCustomers = customers.filter((c) => c.isRepeat).length;
  const repeatCustomerRate =
    customers.length > 0
      ? parseFloat((repeatCustomers / customers.length).toFixed(3))
      : 0;

  res.json({
    totalVisitors,
    bannerClicks,
    bannerCTR,
    productViews,
    saleItemViews,
    browseOnlyCount,
    addToCart,
    addToWishlist,
    removeFromWishlist,
    wishlistToCart,
    productDetailViews,
    nappySubscriptions,
    intendedSubscriptions,
    subscriptions,
    cartAbandons,
    checkoutStarts,
    purchases,
    conversionRate,
    cartAbandonRate,
    repeatCustomerRate,
  });
});

// ─── Campaign Metrics ─────────────────────────────────────────────────────────
router.get("/analytics/campaign-metrics", async (req, res): Promise<void> => {
  const events = await db.select().from(funnelEventsTable);

  const bannerClicks = events.filter(
    (e) => e.eventType === "banner_click",
  ).length;
  const discountItemViews = events.filter(
    (e) => e.eventType === "sale_item_view",
  ).length;
  const discountItemPurchases = events.filter((e) => {
    if (e.eventType !== "purchase") return false;
    try {
      return e.metadata ? JSON.parse(e.metadata).hasSaleItems === true : false;
    } catch {
      return false;
    }
  }).length;
  const browseOnlyVisitors = events.filter(
    (e) => e.eventType === "browse_only",
  ).length;
  const nappySubscriptions = events.filter(
    (e) => e.eventType === "nappy_subscription_click",
  ).length;
  const intendedSubscriptions = events.filter(
    (e) => e.eventType === "intended_subscription",
  ).length;
  const subscriptions = events.filter(
    (e) => e.eventType === "subscribed",
  ).length;

  res.json({
    campaignName: "Happy Mom Mother's Day 2026",
    bannerClicks,
    discountItemViews,
    discountItemPurchases,
    browseOnlyVisitors,
    nappySubscriptions,
    intendedSubscriptions,
    subscriptions,
  });
});

// ─── Site Traffic ─────────────────────────────────────────────────────────────
router.get("/analytics/traffic", async (req, res): Promise<void> => {
  const events = await db.select().from(funnelEventsTable);

  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(now.getDate() - 7);

  // Unique sessions today (consistent unit for totalToday and totalThisWeek)
  const todaySessions = new Set(
    events
      .filter((e) => new Date(e.createdAt).toDateString() === now.toDateString())
      .map((e) => e.sessionId),
  );
  const weekSessions = new Set(
    events
      .filter((e) => new Date(e.createdAt) >= weekAgo)
      .map((e) => e.sessionId),
  );

  const activeNow = Math.max(0, Math.floor(weekSessions.size * 0.08));

  // Hourly traffic for today only — unique sessions per hour
  const pageViewsToday = events.filter(
    (e) =>
      e.eventType === "page_view" &&
      new Date(e.createdAt).toDateString() === now.toDateString(),
  );
  const hourlyTraffic = Array.from({ length: 12 }, (_, i) => {
    const hour = 8 + i;
    const label = `${hour}:00`;
    const cnt = new Set(
      pageViewsToday
        .filter((e) => new Date(e.createdAt).getHours() === hour)
        .map((e) => e.sessionId),
    ).size;
    return { label, visitors: cnt };
  });

  // Daily traffic last 7 days — unique sessions per day
  const dailyTraffic = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const label = d.toLocaleDateString("en-GB", {
      weekday: "short",
      day: "numeric",
    });
    const cnt = new Set(
      events
        .filter((e) => new Date(e.createdAt).toDateString() === d.toDateString())
        .map((e) => e.sessionId),
    ).size;
    return { label, visitors: cnt };
  });

  res.json({
    activeNow,
    totalToday: todaySessions.size,
    totalThisWeek: weekSessions.size,
    hourlyTraffic,
    dailyTraffic,
  });
});

// ─── Customer Trends ─────────────────────────────────────────────────────────
router.get("/analytics/customer-trends", async (req, res): Promise<void> => {
  const customers = await db.select().from(customersTable);

  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const newThisMonth = customers.filter(
    (c) => new Date(c.createdAt) >= thisMonthStart && !c.isRepeat,
  ).length;
  const repeatCustomers = customers.filter((c) => c.isRepeat).length;
  const activeSubscriptions = customers.filter((c) => c.isSubscribed).length;
  const repeatRate =
    customers.length > 0
      ? parseFloat(((repeatCustomers / customers.length) * 100).toFixed(1))
      : 0;

  // Compute real monthly breakdown from actual customer createdAt timestamps
  const monthlyTrend = Array.from({ length: 5 }, (_, i) => {
    const offsetMonths = 4 - i; // 4 months ago → 0 months ago
    const d = new Date(now.getFullYear(), now.getMonth() - offsetMonths, 1);
    const monthStart = new Date(d.getFullYear(), d.getMonth(), 1);
    const monthEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = monthStart.toLocaleDateString("en-US", { month: "short" });

    const inMonth = customers.filter((c) => {
      const t = new Date(c.createdAt).getTime();
      return t >= monthStart.getTime() && t <= monthEnd.getTime();
    });

    return {
      month: label,
      newCustomers: inMonth.filter((c) => !c.isRepeat).length,
      repeatCustomers: inMonth.filter((c) => c.isRepeat).length,
      subscriptions: inMonth.filter((c) => c.isSubscribed).length,
    };
  });

  res.json({
    totalCustomers: customers.length,
    newThisMonth,
    repeatCustomers,
    repeatRate,
    activeSubscriptions,
    monthlyTrend,
  });
});

// ─── Drop-off Analysis ────────────────────────────────────────────────────────
router.get("/analytics/drop-off", async (req, res): Promise<void> => {
  const events = await db.select().from(funnelEventsTable);

  // Count unique sessions that reached each stage — a session "reaches" a stage
  // if it fired at least one event of the relevant type(s).
  const sessionSet = (types: string[]) =>
    new Set(events.filter((e) => types.includes(e.eventType)).map((e) => e.sessionId)).size;

  const pageViews          = new Set(events.map((e) => e.sessionId)).size;
  const bannerClicks       = sessionSet(["banner_click"]);
  const productViews       = sessionSet(["product_view", "sale_item_view", "browse_only"]);
  const productDetailViews = sessionSet(["product_detail_view"]);
  const subscriptionIntents = sessionSet(["intended_subscription"]);
  const addToWishlist      = sessionSet(["add_to_wishlist"]);
  // Any session that reached checkout or purchase must have added to cart first
  // (even if the add_to_cart event was not recorded), so include those event
  // types here to keep the funnel monotonically non-increasing.
  const addToCart          = sessionSet(["add_to_cart", "wishlist_to_cart", "checkout_start", "purchase"]);
  const purchases          = sessionSet(["purchase"]);
  // A completed purchase implies a checkout — count any session that either
  // explicitly started checkout or went straight to purchase.
  const checkouts          = sessionSet(["checkout_start", "purchase"]);
  const subscribed         = sessionSet(["subscribed"]);

  const stages = [
    // ── Purchase path ──────────────────────────────────────────────────────────
    { stage: "Landing Page View",    users: pageViews,           dropOff: 0, dropOffRate: 0 },
    { stage: "Banner Click",         users: bannerClicks,        dropOff: 0, dropOffRate: 0 },
    { stage: "Product View",         users: productViews,        dropOff: 0, dropOffRate: 0 },
    { stage: "Product Detail View",  users: productDetailViews,  dropOff: 0, dropOffRate: 0 },
    { stage: "Wishlist Save",        users: addToWishlist,       dropOff: 0, dropOffRate: 0 },
    { stage: "Add to Cart",          users: addToCart,           dropOff: 0, dropOffRate: 0 },
    { stage: "Checkout / Purchased", users: checkouts,           dropOff: 0, dropOffRate: 0 },
    // ── Subscription path (parallel to purchase path) ─────────────────────────
    { stage: "Subscription Intent",  users: subscriptionIntents, dropOff: 0, dropOffRate: 0 },
    { stage: "Subscribed",           users: subscribed,          dropOff: 0, dropOffRate: 0 },
  ];

  // Calculate drop-off between stages — clamp to 0 (non-monotonic funnels
  // arise when users skip optional stages like the banner or cart)
  for (let i = 0; i < stages.length - 1; i++) {
    const raw = stages[i].users - stages[i + 1].users;
    const dropOff = Math.max(0, raw);
    stages[i].dropOff = dropOff;
    stages[i].dropOffRate =
      stages[i].users > 0
        ? parseFloat(((dropOff / stages[i].users) * 100).toFixed(1))
        : 0;
  }

  // Checkout / Purchased is a terminal stage on the purchase path — the subscription
  // path is parallel, not sequential, so no drop-off is shown here.
  const checkoutPurchasedIdx = stages.findIndex((s) => s.stage === "Checkout / Purchased");
  if (checkoutPurchasedIdx >= 0) {
    stages[checkoutPurchasedIdx].dropOff = 0;
    stages[checkoutPurchasedIdx].dropOffRate = 0;
  }

  // Subscription Intent: true drop-off = sessions that had intent but never subscribed.
  const subIntentIdx = stages.findIndex((s) => s.stage === "Subscription Intent");
  if (subIntentIdx >= 0) {
    const intents = stages[subIntentIdx].users;
    const trueDropOff = Math.max(0, intents - subscribed);
    stages[subIntentIdx].dropOff = trueDropOff;
    stages[subIntentIdx].dropOffRate =
      intents > 0 ? parseFloat(((trueDropOff / intents) * 100).toFixed(1)) : 0;
  }

  // Subscribed is a terminal conversion stage — no further step to drop off to.
  const subscribedIdx = stages.findIndex((s) => s.stage === "Subscribed");
  if (subscribedIdx >= 0) {
    stages[subscribedIdx].dropOff = 0;
    stages[subscribedIdx].dropOffRate = 0;
  }

  // Exclude terminal stages from top drop-off ranking.
  const terminalStages = new Set(["Checkout / Purchased", "Subscribed"]);
  const topDropOffStage =
    stages
      .filter((s) => !terminalStages.has(s.stage))
      .sort((a, b) => b.dropOff - a.dropOff)[0]?.stage ??
    "Banner Click";

  // Compute real drop-off reason counts from actual session data
  const cartAbandonSessions = sessionSet(["cart_abandon"]);
  const noEngagement        = Math.max(0, pageViews - bannerClicks);
  const viewedNotCarted     = Math.max(0, productViews - addToCart);
  const checkoutAbandons    = Math.max(0, checkouts - purchases);
  const subIntentDropoff    = Math.max(0, subscriptionIntents - subscribed);

  const totalDropped = noEngagement + viewedNotCarted + cartAbandonSessions + checkoutAbandons + subIntentDropoff;
  const safeTotal = Math.max(totalDropped, 1);
  const pctOf = (n: number) => Math.round((n / safeTotal) * 100);

  const rawReasons = [
    { reason: "Left without engaging with banner — low initial hook or awareness", count: noEngagement, percentage: pctOf(noEngagement) },
    { reason: "Viewed products but did not add to cart — price or relevance friction", count: viewedNotCarted, percentage: pctOf(viewedNotCarted) },
    { reason: "Added to cart then abandoned — shipping cost surprise or checkout friction", count: cartAbandonSessions, percentage: pctOf(cartAbandonSessions) },
    { reason: "Started checkout but did not complete purchase — payment or UX friction", count: checkoutAbandons, percentage: pctOf(checkoutAbandons) },
    { reason: "Had subscription intent but did not subscribe — commitment or pricing friction", count: subIntentDropoff, percentage: pctOf(subIntentDropoff) },
  ];

  const dropOffReasons = rawReasons.filter((r) => r.count > 0).length > 0
    ? rawReasons.filter((r) => r.count > 0)
    : [{ reason: "No significant drop-off detected yet — keep collecting sessions", count: 0, percentage: 0 }];

  res.json({ stages, topDropOffStage, dropOffReasons });
});

// ─── Sheet Info ───────────────────────────────────────────────────────────────
router.get("/analytics/sheet-info", async (req, res): Promise<void> => {
  const rows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "gsheet_spreadsheet_id"));

  if (!rows.length || !rows[0]) {
    res.json({ sheetUrl: null, spreadsheetId: null, lastSyncedAt: null });
    return;
  }

  const spreadsheetId = rows[0].value;
  const lastRows = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "gsheet_last_synced"));

  res.json({
    spreadsheetId,
    sheetUrl: sheetUrl(spreadsheetId),
    lastSyncedAt: lastRows[0]?.value ?? null,
  });
});

// ─── Sync Funnel Data to Google Sheets ────────────────────────────────────────
router.post("/analytics/sync-gsheet", async (req, res): Promise<void> => {
  // Fetch all events and use the same sessionSet logic as the drop-off dashboard
  // so the sheet values are always identical to what the bar chart shows.
  const events = await db.select().from(funnelEventsTable);

  const sessionSet = (types: string[]) =>
    new Set(events.filter((e) => types.includes(e.eventType)).map((e) => e.sessionId)).size;

  const totalVisitors = new Set(events.map((e) => e.sessionId)).size;
  const totalVisitorsSafe = Math.max(totalVisitors, 1);

  const STAGES = [
    { name: "Landing Page View",    users: totalVisitors },
    { name: "Banner Click",         users: sessionSet(["banner_click"]) },
    { name: "Product View",         users: sessionSet(["product_view", "sale_item_view", "browse_only"]) },
    { name: "Product Detail View",  users: sessionSet(["product_detail_view"]) },
    { name: "Wishlist Save",        users: sessionSet(["add_to_wishlist"]) },
    { name: "Add to Cart",          users: sessionSet(["add_to_cart", "wishlist_to_cart", "checkout_start", "purchase"]) },
    { name: "Checkout / Purchased", users: sessionSet(["checkout_start", "purchase"]) },
    { name: "Subscription Intent",  users: sessionSet(["intended_subscription"]) },
    { name: "Subscribed",           users: sessionSet(["subscribed"]) },
  ];

  const now = new Date().toISOString();

  const headers = ["Stage", "Sessions", "% of Visitors", "Drop-off vs Previous", "Synced At"];
  const dataRows: (string | number)[][] = STAGES.map((stage, i) => {
    const pct = ((stage.users / totalVisitorsSafe) * 100).toFixed(1);
    const prev = i > 0 ? STAGES[i - 1]!.users : totalVisitors;
    const dropOff = prev > stage.users ? prev - stage.users : 0;
    return [stage.name, stage.users, `${pct}%`, dropOff, now];
  });

  const rows: (string | number)[][] = [headers, ...dataRows];

  // Create or retrieve spreadsheet
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "gsheet_spreadsheet_id"));

  let spreadsheetId: string;
  if (existing.length && existing[0]) {
    spreadsheetId = existing[0].value;
  } else {
    spreadsheetId = await createSpreadsheet("Nexpoint Funnel IQ — Funnel Stages");
    await db
      .insert(settingsTable)
      .values({ key: "gsheet_spreadsheet_id", value: spreadsheetId })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: spreadsheetId } });
  }

  const rowsWritten = await clearAndWriteSheet(spreadsheetId, rows);

  await db
    .insert(settingsTable)
    .values({ key: "gsheet_last_synced", value: now })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: now, updatedAt: new Date() } });

  res.json({
    spreadsheetId,
    sheetUrl: sheetUrl(spreadsheetId),
    syncedAt: now,
    rowsWritten,
  });
});

// ─── Sync Conversion Rates to Google Sheets ───────────────────────────────────
router.post("/analytics/sync-gsheet-conversion", async (req, res): Promise<void> => {
  const events = await db.select().from(funnelEventsTable);

  const countByType = (type: string) =>
    events.filter((e) => e.eventType === type).length;

  const sessionSet = (types: string[]) =>
    new Set(events.filter((e) => types.includes(e.eventType)).map((e) => e.sessionId)).size;

  const totalVisitors  = new Set(events.map((e) => e.sessionId)).size;
  const productViews   = countByType("product_view") + countByType("sale_item_view") + countByType("browse_only");
  // Match funnel-summary exactly: raw event count, no checkout_start/purchase
  const addToCart      = countByType("add_to_cart") + countByType("wishlist_to_cart");
  const addToWishlist  = events.filter((e) => e.eventType === "add_to_wishlist" && e.metadata !== '{"action":"remove"}').length;
  const wishlistToCart = countByType("wishlist_to_cart");
  const purchases      = countByType("purchase");
  const cartAbandons   = countByType("cart_abandon");
  const intendedSubs   = countByType("intended_subscription");
  const subscriptions  = countByType("subscribed");
  const browseOnly     = countByType("browse_only");

  const pct = (num: number, den: number) =>
    den > 0 ? Math.min(100, Math.round((num / den) * 100)) : 0;

  const now = new Date().toISOString();

  const headers = ["Metric", "Value (%)", "Numerator", "Denominator", "Status", "Synced At"];
  const status = (v: number, higherIsBetter: boolean, good: number, warn: number) => {
    if (higherIsBetter) {
      if (v >= good) return "Healthy";
      if (v >= warn) return "Watch";
      return "Needs Attention";
    } else {
      if (v < good) return "Healthy";
      if (v < warn) return "Watch";
      return "Needs Attention";
    }
  };

  const convRates = [
    { label: "Product → Cart Rate",     value: pct(addToCart, productViews),      num: addToCart,      den: productViews,   higherIsBetter: true,  good: 8,  warn: 4  },
    { label: "Cart → Purchase Rate",    value: pct(purchases, addToCart),          num: purchases,      den: addToCart,      higherIsBetter: true,  good: 60, warn: 40 },
    { label: "Wishlist Utilisation",    value: pct(wishlistToCart, addToWishlist), num: wishlistToCart, den: addToWishlist,  higherIsBetter: true,  good: 50, warn: 20 },
    { label: "Cart Abandon Rate",       value: pct(cartAbandons, addToCart),       num: cartAbandons,   den: addToCart,      higherIsBetter: false, good: 30, warn: 60 },
    { label: "Subscription Conversion", value: pct(subscriptions, intendedSubs),   num: subscriptions,  den: intendedSubs,   higherIsBetter: true,  good: 50, warn: 25 },
    { label: "Browse-only Rate",        value: pct(browseOnly, totalVisitors),     num: browseOnly,     den: totalVisitors,  higherIsBetter: false, good: 30, warn: 60 },
  ];

  const dataRows: (string | number)[][] = convRates.map((m) => [
    m.label,
    `${m.value}%`,
    m.num,
    m.den,
    status(m.value, m.higherIsBetter, m.good, m.warn),
    now,
  ]);

  const rows: (string | number)[][] = [headers, ...dataRows];

  // Reuse (or create) the same spreadsheet as funnel stages
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "gsheet_spreadsheet_id"));

  let spreadsheetId: string;
  if (existing.length && existing[0]) {
    spreadsheetId = existing[0].value;
  } else {
    spreadsheetId = await createSpreadsheet("Nexpoint Funnel IQ — Funnel Stages");
    await db
      .insert(settingsTable)
      .values({ key: "gsheet_spreadsheet_id", value: spreadsheetId })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: spreadsheetId } });
  }

  await ensureSheetTab(spreadsheetId, "Conversion Rates");
  const rowsWritten = await clearAndWriteNamedSheet(spreadsheetId, "Conversion Rates", rows);

  await db
    .insert(settingsTable)
    .values({ key: "gsheet_conversion_last_synced", value: now })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: now, updatedAt: new Date() } });

  res.json({
    spreadsheetId,
    sheetUrl: sheetUrl(spreadsheetId),
    syncedAt: now,
    rowsWritten,
  });
});

// ─── Sync Customer List to Google Sheets ──────────────────────────────────────
router.post("/analytics/sync-gsheet-customers", async (req, res): Promise<void> => {
  const customers = await db.select().from(customersTable);

  const now = new Date().toISOString();

  const headers = ["Name", "Email", "Source", "Orders", "Total Spend (₹)", "Status", "Synced At"];

  const dataRows: (string | number)[][] = customers.map((c) => {
    const statuses: string[] = [];
    if (c.isRepeat) statuses.push("Repeat");
    if (c.isSubscribed) statuses.push("Subscribed");
    if (!c.isRepeat && !c.isSubscribed) statuses.push("New");
    return [
      c.name ?? "",
      c.email ?? "",
      c.source ?? "—",
      c.totalOrders ?? 0,
      c.totalSpend ? Math.round(Number(c.totalSpend)) : 0,
      statuses.join(", "),
      now,
    ];
  });

  const rows: (string | number)[][] = [headers, ...dataRows];

  // Reuse the same spreadsheet as funnel stages
  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "gsheet_spreadsheet_id"));

  let spreadsheetId: string;
  if (existing.length && existing[0]) {
    spreadsheetId = existing[0].value;
  } else {
    spreadsheetId = await createSpreadsheet("Nexpoint Funnel IQ — Funnel Stages");
    await db
      .insert(settingsTable)
      .values({ key: "gsheet_spreadsheet_id", value: spreadsheetId })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: spreadsheetId } });
  }

  await ensureSheetTab(spreadsheetId, "Customer List");
  const rowsWritten = await clearAndWriteNamedSheet(spreadsheetId, "Customer List", rows);

  await db
    .insert(settingsTable)
    .values({ key: "gsheet_customers_last_synced", value: now })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: now, updatedAt: new Date() } });

  res.json({
    spreadsheetId,
    sheetUrl: sheetUrl(spreadsheetId),
    syncedAt: now,
    rowsWritten,
  });
});

// ─── Sync Experiments to Google Sheets ────────────────────────────────────────
router.post("/analytics/sync-gsheet-experiments", async (req, res): Promise<void> => {
  const experiments = await db.select().from(experimentsTable).orderBy(desc(experimentsTable.createdAt));

  const now = new Date().toISOString();

  const headers = ["ID", "Title", "Funnel Stage", "Hypothesis", "Expected Impact", "Effort", "Status", "Created", "Last Updated", "Merge Note", "Synced At"];

  const dataRows: (string | number)[][] = experiments.map((e) => [
    e.id,
    e.title,
    e.funnelStage,
    e.hypothesis,
    e.expectedImpact,
    e.effort,
    e.status,
    new Date(e.createdAt).toLocaleString("en-IN"),
    e.updatedAt ? new Date(e.updatedAt).toLocaleString("en-IN") : "—",
    e.mergeNote ?? "—",
    now,
  ]);

  const rows: (string | number)[][] = [headers, ...dataRows];

  const existing = await db
    .select()
    .from(settingsTable)
    .where(eq(settingsTable.key, "gsheet_spreadsheet_id"));

  let spreadsheetId: string;
  if (existing.length && existing[0]) {
    spreadsheetId = existing[0].value;
  } else {
    spreadsheetId = await createSpreadsheet("Nexpoint Funnel IQ — Funnel Stages");
    await db
      .insert(settingsTable)
      .values({ key: "gsheet_spreadsheet_id", value: spreadsheetId })
      .onConflictDoUpdate({ target: settingsTable.key, set: { value: spreadsheetId } });
  }

  await ensureSheetTab(spreadsheetId, "Experiments");
  const rowsWritten = await clearAndWriteNamedSheet(spreadsheetId, "Experiments", rows);

  await db
    .insert(settingsTable)
    .values({ key: "gsheet_experiments_last_synced", value: now })
    .onConflictDoUpdate({ target: settingsTable.key, set: { value: now, updatedAt: new Date() } });

  res.json({
    spreadsheetId,
    sheetUrl: sheetUrl(spreadsheetId),
    syncedAt: now,
    rowsWritten,
  });
});

export default router;
