import { pgTable, text, serial, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const experimentsTable = pgTable("experiments", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  hypothesis: text("hypothesis").notNull(),
  expectedImpact: text("expected_impact").notNull(),
  effort: text("effort").notNull().default("medium"),
  funnelStage: text("funnel_stage").notNull(),
  status: text("status").notNull().default("proposed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
  mergeNote: text("merge_note"),
});

export const insertExperimentSchema = createInsertSchema(experimentsTable).omit({ id: true, createdAt: true });
export type InsertExperiment = z.infer<typeof insertExperimentSchema>;
export type Experiment = typeof experimentsTable.$inferSelect;
