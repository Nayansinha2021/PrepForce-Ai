import { Router } from "express";
import { createOrder, verifyPayment, unlockFreeReport } from "../controllers/payment.controller";
import { validateCreateOrder, validateVerifyPayment, validateUnlockFreeReport } from "../middleware/validation";

const router = Router();

router.post("/create-order", validateCreateOrder, createOrder);
router.post("/verify", validateVerifyPayment, verifyPayment);
router.post("/unlock-free-report", validateUnlockFreeReport, unlockFreeReport);

export default router;
