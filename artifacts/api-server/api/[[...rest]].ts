import { VercelRequest, VercelResponse } from "@vercel/node";

export default async (req: VercelRequest, res: VercelResponse) => {
  try {
    const { default: app } = await import("../dist/index.mjs");
    return app(req, res);
  } catch (error) {
    console.error("Error loading app:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};
