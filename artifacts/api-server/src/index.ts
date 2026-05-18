import app from "./app";
import { logger } from "./lib/logger";
import { runHealthAudit } from "./routes/health-audit";
import { db } from "@workspace/db";
import { settingsTable } from "@workspace/db";
import router from "./routes/index.js";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

// Mount all API routes under /api prefix
app.use("/api", router);

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
  scheduleDaily3amAudit();
});

/** Schedule a health audit at 3:00 AM local time every day. */
function scheduleDaily3amAudit(): void {
  const msUntilNext3am = (): number => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(3, 0, 0, 0);
    if (next <= now) next.setDate(next.getDate() + 1);
    return next.getTime() - now.getTime();
  };

  const runAndReschedule = () => {
    logger.info("Running scheduled daily App Health audit");
    runHealthAudit()
      .then(async (report) => {
        await db
          .insert(settingsTable)
          .values({ key: "health_report", value: JSON.stringify(report) })
          .onConflictDoUpdate({
            target: settingsTable.key,
            set: { value: JSON.stringify(report), updatedAt: new Date() },
          });
        logger.info({ score: report.overallScore, grade: report.overallGrade }, "Daily health audit complete");
      })
      .catch((err) => logger.error({ err }, "Daily health audit failed"))
      .finally(() => {
        setTimeout(runAndReschedule, msUntilNext3am());
      });
  };

  const delay = msUntilNext3am();
  const nextRun = new Date(Date.now() + delay);
  logger.info({ nextRun: nextRun.toISOString() }, "Daily health audit scheduled");
  setTimeout(runAndReschedule, delay);
}
