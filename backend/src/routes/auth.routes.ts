import { Router } from "express";
import { sendVerificationOtp, verifyOtpAndCreateAccount } from "../controllers/auth.controller";
import { authLimiter } from "../middleware/rateLimiter";
import { validateSendOtp, validateVerifyOtp } from "../middleware/validation";

const router = Router();

router.post("/send-otp", authLimiter, validateSendOtp, sendVerificationOtp);
router.post("/verify-otp", authLimiter, validateVerifyOtp, verifyOtpAndCreateAccount);

export default router;
