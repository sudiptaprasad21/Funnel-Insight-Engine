import { pgTable, text, serial, timestamp, integer, boolean, real } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const customersTable = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  isRepeat: boolean("is_repeat").notNull().default(false),
  isSubscribed: boolean("is_subscribed").notNull().default(false),
  subscriptionDays: integer("subscription_days"),
  subscriptionPlan: text("subscription_plan"),
  totalOrders: integer("total_orders").notNull().default(0),
  totalSpend: real("total_spend").notNull().default(0),
  source: text("source"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertCustomerSchema = createInsertSchema(customersTable).omit({ id: true, createdAt: true });
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Customer = typeof customersTable.$inferSelect;
