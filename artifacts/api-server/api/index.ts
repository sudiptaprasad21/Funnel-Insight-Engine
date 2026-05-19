import app from "../src/app";
   import { logger } from "../src/lib/logger";
   import { runHealthAudit } from "../src/routes/health-audit";
   import { db } from "@workspace/db";
   import { settingsTable } from "@workspace/db";
   import router from "../src/routes/index";

   // Mount all API routes under /api prefix
   app.use("/api", router);

   const rawPort = process.env["PORT"] || "3001";
   const port = Number(rawPort);

   app.listen(port, () => {
     logger.info({ port }, "Server listening");
   });

   export default app;
