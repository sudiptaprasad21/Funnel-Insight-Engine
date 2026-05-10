import { Router, type IRouter } from "express";
import healthRouter from "./health";
import eventsRouter from "./events";
import customersRouter from "./customers";
import productsRouter from "./products";
import analyticsRouter from "./analytics";
import aiRouter from "./ai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(eventsRouter);
router.use(customersRouter);
router.use(productsRouter);
router.use(analyticsRouter);
router.use(aiRouter);

export default router;
