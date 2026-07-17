import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import { generateFeedbackReport } from "../controllers/report.controller";

const router = Router();

// Protected route to view feedback report
router.get("/:sessionId", requireAuth, generateFeedbackReport);

export default router;
