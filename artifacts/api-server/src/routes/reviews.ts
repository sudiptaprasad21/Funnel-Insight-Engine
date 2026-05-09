import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { reviewsTable } from "@workspace/db";
import { ListReviewsQueryParams, CreateReviewBody } from "@workspace/api-zod";
import { desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/reviews", async (req, res): Promise<void> => {
  const query = ListReviewsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { productId, minRating, limit } = query.data;

  let results = await db
    .select()
    .from(reviewsTable)
    .orderBy(desc(reviewsTable.createdAt))
    .limit(limit ?? 50);

  if (productId) {
    results = results.filter((r) => r.productId === productId);
  }
  if (minRating) {
    results = results.filter((r) => r.rating >= minRating);
  }

  res.json(results);
});

router.post("/reviews", async (req, res): Promise<void> => {
  const parsed = CreateReviewBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const sentiment =
    parsed.data.sentiment ??
    (parsed.data.rating >= 4
      ? "positive"
      : parsed.data.rating === 3
        ? "neutral"
        : "negative");

  const [review] = await db
    .insert(reviewsTable)
    .values({ ...parsed.data, sentiment })
    .returning();

  res.status(201).json(review);
});

export default router;
