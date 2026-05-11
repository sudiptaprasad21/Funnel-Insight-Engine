import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import { customersTable } from "@workspace/db";
import {
  CreateCustomerBody,
  UpdateCustomerBody,
  GetCustomerParams,
  ListCustomersQueryParams,
  ListCustomersResponse,
  GetCustomerResponse,
} from "@workspace/api-zod";
import { eq, desc } from "drizzle-orm";

const router: IRouter = Router();

router.get("/customers", async (req, res): Promise<void> => {
  const query = ListCustomersQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { type, limit } = query.data;

  let customers = await db
    .select()
    .from(customersTable)
    .orderBy(desc(customersTable.createdAt))
    .limit(limit ?? 50);

  if (type && type !== "all") {
    if (type === "repeat") {
      customers = customers.filter((c) => c.isRepeat);
    } else if (type === "new") {
      customers = customers.filter((c) => !c.isRepeat);
    } else if (type === "subscribed") {
      customers = customers.filter((c) => c.isSubscribed);
    }
  }

  res.json(ListCustomersResponse.parse(customers));
});

router.post("/customers", async (req, res): Promise<void> => {
  const parsed = CreateCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  try {
    const [customer] = await db
      .insert(customersTable)
      .values(parsed.data)
      .returning();

    res.status(201).json(GetCustomerResponse.parse(customer));
  } catch (err: unknown) {
    const pg = err as { code?: string; cause?: { code?: string } };
    const code = pg.code ?? pg.cause?.code;
    if (code === "23505") {
      res.status(409).json({ error: "A customer with this email already exists" });
      return;
    }
    throw err;
  }
});

router.patch("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const body = UpdateCustomerBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }

  if (Object.keys(body.data).length === 0) {
    res.status(400).json({ error: "No fields provided to update" });
    return;
  }

  const [customer] = await db
    .update(customersTable)
    .set(body.data)
    .where(eq(customersTable.id, params.data.id))
    .returning();

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(GetCustomerResponse.parse(customer));
});

router.get("/customers/:id", async (req, res): Promise<void> => {
  const params = GetCustomerParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [customer] = await db
    .select()
    .from(customersTable)
    .where(eq(customersTable.id, params.data.id));

  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }

  res.json(GetCustomerResponse.parse(customer));
});

export default router;
