import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { productsTable } from "@workspace/db";
import {
  CreateProductBody,
  GetProductParams,
  ListProductsQueryParams,
  ListProductsResponse,
  GetProductResponse,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/products", async (req, res): Promise<void> => {
  const query = ListProductsQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { onSale, category } = query.data;

  let allProducts = await db
    .select()
    .from(productsTable)
    .orderBy(desc(productsTable.createdAt));

  if (onSale !== undefined) {
    allProducts = allProducts.filter((p) => p.onSale === onSale);
  }
  if (category) {
    allProducts = allProducts.filter((p) => p.category === category);
  }

  res.json(ListProductsResponse.parse(allProducts));
});

router.post("/products", async (req, res): Promise<void> => {
  const parsed = CreateProductBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [product] = await db
    .insert(productsTable)
    .values(parsed.data)
    .returning();

  res.status(201).json(GetProductResponse.parse(product));
});

router.get("/products/:id", async (req, res): Promise<void> => {
  const params = GetProductParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [product] = await db
    .select()
    .from(productsTable)
    .where(eq(productsTable.id, params.data.id));

  if (!product) {
    res.status(404).json({ error: "Product not found" });
    return;
  }

  res.json(GetProductResponse.parse(product));
});

export default router;
