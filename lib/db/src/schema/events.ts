import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const funnelEventsTable = pgTable("funnel_events", {
  id: serial("id").primaryKey(),
  eventType: text("event_type").notNull(),
  sessionId: text("session_id").notNull(),
  customerId: integer("customer_id"),
  productId: integer("product_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertFunnelEventSchema = createInsertSchema(funnelEventsTable).omit({ id: true, createdAt: true });
export type InsertFunnelEvent = z.infer<typeof insertFunnelEventSchema>;
export type FunnelEvent = typeof funnelEventsTable.$inferSelect;
