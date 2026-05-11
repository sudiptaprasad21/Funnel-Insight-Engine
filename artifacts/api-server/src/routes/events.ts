import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { funnelEventsTable, customersTable } from "@workspace/db";
import {
  TrackEventBody,
  ListEventsQueryParams,
  ListEventsResponse,
} from "@workspace/api-zod";
import { desc, eq, sql, and } from "drizzle-orm";

const router: IRouter = Router();

router.post("/events", async (req, res): Promise<void> => {
  const parsed = TrackEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [event] = await db
    .insert(funnelEventsTable)
    .values(parsed.data)
    .returning();

  // When a purchase is recorded, update the customer's order count and spend
  if (parsed.data.eventType === "purchase" && parsed.data.customerId) {
    const customerId = parsed.data.customerId;
    let orderTotal = 0;
    if (parsed.data.metadata) {
      try {
        const meta = JSON.parse(parsed.data.metadata);
        orderTotal = typeof meta.total === "number" ? meta.total : 0;
      } catch {
        // ignore malformed metadata
      }
    }
    await db
      .update(customersTable)
      .set({
        totalOrders: sql`${customersTable.totalOrders} + 1`,
        totalSpend: sql`${customersTable.totalSpend} + ${orderTotal}`,
        isRepeat: sql`${customersTable.totalOrders} >= 1`,
      })
      .where(eq(customersTable.id, customerId));
  }

  res.status(201).json(event);
});

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit, eventType, sessionId } = query.data;

  const conditions = [];
  if (eventType) conditions.push(eq(funnelEventsTable.eventType, eventType));
  if (sessionId) conditions.push(eq(funnelEventsTable.sessionId, sessionId));

  const events = await db
    .select()
    .from(funnelEventsTable)
    .where(conditions.length > 0 ? and(...conditions) : undefined)
    .orderBy(desc(funnelEventsTable.createdAt))
    .limit(limit ?? 100);

  res.json(ListEventsResponse.parse(events));
});

export default router;
