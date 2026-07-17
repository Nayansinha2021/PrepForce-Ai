import { Request, Response, NextFunction } from "express";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const OTP_REGEX = /^\d{6}$/;

interface ValidationRule {
  required?: boolean;
  type?: string;
  regex?: RegExp;
  minLength?: number;
  custom?: (val: any) => boolean;
  message?: string;
}

// Centrale logic to execute body validations
export const validateBody = (schema: Record<string, ValidationRule>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const body = req.body || {};
    for (const [key, rules] of Object.entries(schema)) {
      const val = body[key];

      // Required check
      if (rules.required && (val === undefined || val === null || val === "")) {
        return res.status(400).json({ error: rules.message || `${key} is required.` });
      }

      if (val !== undefined && val !== null && val !== "") {
        // Type check
        if (rules.type && typeof val !== rules.type) {
          return res.status(400).json({ error: rules.message || `${key} must be of type ${rules.type}.` });
        }

        // Min length check
        if (rules.minLength !== undefined && typeof val === "string" && val.trim().length < rules.minLength) {
          return res.status(400).json({ error: rules.message || `${key} must be at least ${rules.minLength} characters long.` });
        }

        // Regex format check
        if (rules.regex && typeof val === "string" && !rules.regex.test(val)) {
          return res.status(400).json({ error: rules.message || `Invalid format for ${key}.` });
        }

        // Custom validation check
        if (rules.custom && !rules.custom(val)) {
          return res.status(400).json({ error: rules.message || `Invalid value for ${key}.` });
        }
      }
    }
    next();
  };
};

// Central logic to execute query parameter validations
export const validateQuery = (schema: Record<string, { required?: boolean; custom?: (val: any) => boolean; message?: string }>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const query = req.query || {};
    for (const [key, rules] of Object.entries(schema)) {
      const val = query[key];
      if (rules.required && (val === undefined || val === null || val === "")) {
        return res.status(400).json({ error: rules.message || `Query parameter '${key}' is required.` });
      }
      if (val !== undefined && val !== null && val !== "") {
        if (rules.custom && !rules.custom(val)) {
          return res.status(400).json({ error: rules.message || `Invalid query parameter '${key}'.` });
        }
      }
    }
    next();
  };
};

// Central logic to execute path parameter validations
export const validateParams = (schema: Record<string, { regex?: RegExp; custom?: (val: any) => boolean; message?: string }>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const params = req.params || {};
    for (const [key, rules] of Object.entries(schema)) {
      const val = params[key];
      if (val !== undefined && val !== null && val !== "") {
        if (rules.regex && typeof val === "string" && !rules.regex.test(val)) {
          return res.status(400).json({ error: rules.message || `Invalid parameter '${key}'.` });
        }
        if (rules.custom && !rules.custom(val)) {
          return res.status(400).json({ error: rules.message || `Invalid parameter '${key}'.` });
        }
      }
    }
    next();
  };
};

// Custom type/value checkers
const isInteger = (val: any) => !isNaN(val) && Number.isInteger(Number(val));
const isPositiveInteger = (val: any) => isInteger(val) && Number(val) > 0;
const isNonNegativeInteger = (val: any) => isInteger(val) && Number(val) >= 0;

// Centralized Validation Schemas

// Authentication Schemas
export const validateSendOtp = validateBody({
  email: { required: true, type: "string", regex: EMAIL_REGEX, message: "A valid email address is required." }
});

export const validateVerifyOtp = validateBody({
  email: { required: true, type: "string", regex: EMAIL_REGEX, message: "A valid email address is required." },
  password: { required: true, type: "string", minLength: 6, message: "Password must be at least 6 characters long." },
  otp: { required: true, type: "string", regex: OTP_REGEX, message: "Verification OTP must be a 6-digit number." }
});

// Payments Schemas
export const validateCreateOrder = validateBody({
  planId: { 
    required: true, 
    type: "string", 
    custom: (val) => ["pro_plan_monthly", "pro_plan_yearly", "extra_interview_20", "premium_report"].includes(val),
    message: "Invalid plan ID specified." 
  },
  userId: { required: false, type: "string" }
});

export const validateVerifyPayment = validateBody({
  razorpay_order_id: { required: true, type: "string", message: "Razorpay order ID is required." },
  razorpay_payment_id: { required: true, type: "string", message: "Razorpay payment ID is required." },
  razorpay_signature: { required: true, type: "string", message: "Razorpay signature is required." }
});

export const validateUnlockFreeReport = validateBody({
  userId: { required: true, type: "string", regex: UUID_REGEX, message: "A valid User ID (UUID format) is required." },
  sessionId: { required: true, type: "string", regex: UUID_REGEX, message: "A valid Session ID (UUID format) is required." }
});

// Interviews Schemas
export const validateChat = validateBody({
  sessionId: { required: true, type: "string", message: "Session ID is required." },
  answer: { required: true, type: "string", message: "Answer content must be provided." },
  codeContext: { required: false, type: "string" }
});

export const validateBehavior = validateBody({
  sessionId: { required: true, type: "string", minLength: 1, message: "Session ID is required." },
  metrics: { 
    required: true, 
    type: "object", 
    custom: (metrics) => 
      metrics && 
      typeof metrics.totalFrames === "number" && 
      typeof metrics.neutralFrames === "number" && 
      typeof metrics.smileFrames === "number" && 
      typeof metrics.distractedFrames === "number",
    message: "Metrics object must contain totalFrames, neutralFrames, smileFrames, and distractedFrames as numeric properties." 
  }
});

// Admin Schemas
export const validateBanUser = validateBody({
  userId: { required: true, type: "string", regex: UUID_REGEX, message: "A valid User ID (UUID format) is required to ban." }
});

export const validateUnbanUser = validateBody({
  userId: { required: true, type: "string", regex: UUID_REGEX, message: "A valid User ID (UUID format) is required to unban." }
});

export const validateResetUserLimit = validateBody({
  userId: { required: true, type: "string", regex: UUID_REGEX, message: "A valid User ID (UUID format) is required." },
  plan: { 
    required: false, 
    type: "string", 
    custom: (val) => ["free", "pro_monthly", "pro_yearly"].includes(val),
    message: "Plan must be 'free', 'pro_monthly', or 'pro_yearly'." 
  },
  interviewsLeft: { 
    required: false, 
    custom: (val) => isNonNegativeInteger(val), 
    message: "Interviews left count must be a non-negative integer." 
  }
});

export const validateDeleteUser = validateBody({
  userId: { required: true, type: "string", regex: UUID_REGEX, message: "A valid User ID (UUID format) is required to delete." }
});

export const validateExecuteConsoleCommand = validateBody({
  command: { 
    required: true, 
    type: "string", 
    custom: (val) => val.trim().length > 0, 
    message: "A non-empty console terminal command is required." 
  }
});

export const validateBroadcastEmail = validateBody({
  subject: { required: true, type: "string", minLength: 3, message: "Email subject is required and must be at least 3 characters." },
  content: { required: true, type: "string", minLength: 10, message: "Email body content is required and must be at least 10 characters." },
  headline: { required: false, type: "string" },
  targetPlan: { 
    required: false, 
    type: "string", 
    custom: (val) => ["all", "free", "pro_monthly", "pro_yearly"].includes(val),
    message: "Target plan segment must be 'all', 'free', 'pro_monthly', or 'pro_yearly'." 
  }
});

// Admin Query validations
export const validateGetTableData = (req: Request, res: Response, next: NextFunction) => {
  const schema = {
    table: { 
      required: true, 
      custom: (val: any) => ["user_profiles", "interviews", "messages"].includes(val),
      message: "Access denied. Requested database table is not whitelisted." 
    },
    limit: {
      required: false,
      custom: (val: any) => isPositiveInteger(val),
      message: "Query parameter 'limit' must be a positive integer."
    },
    offset: {
      required: false,
      custom: (val: any) => isNonNegativeInteger(val),
      message: "Query parameter 'offset' must be a non-negative integer."
    }
  };
  return validateQuery(schema)(req, res, next);
};

// Params validations
export const validateSessionIdParam = validateParams({
  sessionId: { regex: UUID_REGEX, message: "Route session ID parameter must be a valid UUID format." }
});

export const validateIdParam = validateParams({
  id: { regex: UUID_REGEX, message: "Route ID parameter must be a valid UUID format." }
});
