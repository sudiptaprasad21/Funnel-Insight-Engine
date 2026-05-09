import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { funnelEventsTable } from "@workspace/db";
import {
  TrackEventBody,
  ListEventsQueryParams,
  ListEventsResponse,
} from "@workspace/api-zod";
import { desc } from "drizzle-orm";

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

  res.status(201).json(event);
});

router.get("/events", async (req, res): Promise<void> => {
  const query = ListEventsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { limit } = query.data;

  const events = await db
    .select()
    .from(funnelEventsTable)
    .orderBy(desc(funnelEventsTable.createdAt))
    .limit(limit ?? 100);

  res.json(ListEventsResponse.parse(events));
});

export default router;
