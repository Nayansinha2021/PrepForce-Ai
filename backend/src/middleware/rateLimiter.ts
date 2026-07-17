import rateLimit from "express-rate-limit";

// Auth Limits: 5 requests per 15 minutes to prevent brute forcing
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { 
    error: "Too many login or registration attempts. Please try again after 15 minutes." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Resume Upload Limits: 3 requests per 10 minutes (file uploads are heavy and costly)
export const uploadResumeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 3,
  message: { 
    error: "Too many resume uploads. Please wait 10 minutes before uploading another resume." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Chat / Interview Limits: 30 requests per minute for active mock interviews
export const chatLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { 
    error: "Rate limit exceeded for interview chat. Please wait a moment before sending another message." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin Limits: 30 requests per minute
export const adminLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { 
    error: "Too many administrative operations. Please wait a moment." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API Limits: 100 requests per 15 minutes
export const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { 
    error: "Too many requests. Please try again later." 
  },
  standardHeaders: true,
  legacyHeaders: false,
});
