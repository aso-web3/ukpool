import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import publicRouter from "./public";
import adminRouter from "./admin";
import agentRouter from "./agent";
import cashierRouter from "./cashier";
import ticketsRouter from "./tickets";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(publicRouter);
router.use(adminRouter);
router.use(agentRouter);
router.use(cashierRouter);
router.use(ticketsRouter);

export default router;
