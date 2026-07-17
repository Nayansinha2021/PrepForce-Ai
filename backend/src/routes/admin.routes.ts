import { Router } from "express";
import { requireAdmin } from "../middleware/auth";
import { 
  getAdminStats, 
  getUsersList, 
  banUser, 
  unbanUser, 
  resetUserLimit,
  deleteUser,
  executeConsoleCommand,
  getTableData,
  getAdminInterviews,
  broadcastEmail
} from "../controllers/admin.controller";
import {
  validateBanUser,
  validateUnbanUser,
  validateResetUserLimit,
  validateDeleteUser,
  validateExecuteConsoleCommand,
  validateGetTableData,
  validateBroadcastEmail
} from "../middleware/validation";

const router = Router();

// Secure administrative endpoints behind verified database role middleware
router.get("/stats", requireAdmin, getAdminStats);
router.get("/users", requireAdmin, getUsersList);
router.post("/ban", requireAdmin, validateBanUser, banUser);
router.post("/unban", requireAdmin, validateUnbanUser, unbanUser);
router.post("/reset", requireAdmin, validateResetUserLimit, resetUserLimit);
router.post("/delete", requireAdmin, validateDeleteUser, deleteUser);
router.post("/execute-command", requireAdmin, validateExecuteConsoleCommand, executeConsoleCommand);
router.get("/table-data", requireAdmin, validateGetTableData, getTableData);
router.get("/interviews", requireAdmin, getAdminInterviews);
router.post("/broadcast-email", requireAdmin, validateBroadcastEmail, broadcastEmail);

export default router;
