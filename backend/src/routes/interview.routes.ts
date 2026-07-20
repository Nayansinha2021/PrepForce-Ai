import { Router } from "express";
import { requireAuth } from "../middleware/auth";
import multer from "multer";
import { parseResumeToText, structureResumeData } from "../services/resumeParser";
import { supabase } from "../config/supabase";
import { uploadToS3 } from "../services/s3Service";
import fs from "fs";
import { chatLimiter, uploadResumeLimiter } from "../middleware/rateLimiter";
import { validateChat, validateBehavior, validateIdParam } from "../middleware/validation";

const router = Router();
const upload = multer({ dest: "uploads/" }); // Temporary local storage for parsing

import { handleAiInterviewChat, mockSessionCache } from "../controllers/interview.controller";

// Protected route to start an interview session
router.post("/start", requireAuth, (req, res) => {
  res.json({ message: "Interview session created", sessionId: "mock-123" });
});

// Protected route for conversational ping-pong
router.post("/chat", requireAuth, chatLimiter, validateChat, handleAiInterviewChat);

// Protected route to save behavioral data
router.post("/behavior", requireAuth, validateBehavior, async (req, res) => {
  try {
    const { sessionId, metrics } = req.body;
    
    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isMockSession = !UUID_REGEX.test(sessionId);

    if (isMockSession) {
      const cached = mockSessionCache.get(sessionId);
      if (cached) {
        cached.interview.behavioral_data = metrics;
      }
      return res.json({ success: true });
    }

    // Save to database (do NOT set status to 'completed' here — report endpoint handles that)
    await supabase
      .from('interviews')
      .update({ behavioral_data: metrics })
      .eq('id', sessionId);
      
    res.json({ success: true });
  } catch (error: any) {
    console.error("Behavior save error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Protected route to upload resume
router.post("/upload-resume", requireAuth, uploadResumeLimiter, upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No resume file provided" });
    }

    // 1. Parse PDF/DOCX to text locally
    const text = await parseResumeToText(req.file.path, req.file.originalname);

    // 2. Upload file to AWS S3 and clean up the local temp cache
    const s3Url = await uploadToS3(req.file.path, req.file.originalname);

    // 3. Structure resume text using AI
    const structuredData = await structureResumeData(text);
    
    // 4. Save S3 public URL inside the structured resume context JSONB column
    structuredData.resumeUrl = s3Url;

    // 2b. Merge in optional Job Description / Role
    const { jobTitle, jobDescription } = req.body;
    if (jobTitle) {
      structuredData.role = jobTitle;
      structuredData.targetRole = jobTitle;
    }
    if (jobDescription) {
      structuredData.targetJobDescription = jobDescription;
    }

    // 3. Insert into Supabase 'interviews' table
    const userId = (req as any).user?.id;
    const isMock = userId === "mock-user-123" || !userId;

    if (!isMock) {
      // 1. Fetch the user profile to see their plan
      let { data: userProfile, error: profileError } = await supabase
        .from('user_profiles')
        .select('plan, interviews_left')
        .eq('id', userId)
        .maybeSingle();

      if (profileError) {
        console.error("Profile fetch error:", profileError);
        return res.status(500).json({ error: `Failed to verify user profile: ${profileError.message}` });
      }

      if (!userProfile) {
        // Auto-provision user profile if missing
        const userEmail = (req as any).user?.email || '';
        const { data: createdProfile, error: provisionErr } = await supabase
          .from('user_profiles')
          .insert({
            id: userId,
            email: userEmail,
            plan: 'free',
            interviews_left: 2,
            role: 'user',
            status: 'active'
          })
          .select('plan, interviews_left')
          .single();

        if (provisionErr || !createdProfile) {
          console.error("Profile auto-creation error:", provisionErr);
          return res.status(500).json({ error: `Failed to create user profile: ${provisionErr?.message || 'Unknown error'}` });
        }
        userProfile = createdProfile;
      }

      if (userProfile.plan === 'free') {
        // Enforce 2 interviews per day limit for free tier
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);

        const { data: todayInterviews, error: countError } = await supabase
          .from('interviews')
          .select('id')
          .eq('user_id', userId)
          .gte('created_at', startOfToday.toISOString());

        if (countError) {
          console.error("Interview count error:", countError);
          return res.status(500).json({ error: `Failed to verify daily interview limit: ${countError.message}` });
        }

        if (todayInterviews && todayInterviews.length >= 2) {
          return res.status(403).json({ 
            error: "Daily limit reached. Free tier is limited to 2 interviews per day. Please upgrade to Pro for more!" 
          });
        }
      } else {
        // For Pro plans, enforce absolute interview counts
        if (userProfile.interviews_left <= 0) {
          return res.status(403).json({ error: "No interviews remaining on your Pro plan. Please purchase extra interviews." });
        }

        // Deduct 1 interview for Pro users
        const { error: deductError } = await supabase
          .from('user_profiles')
          .update({ interviews_left: userProfile.interviews_left - 1 })
          .eq('id', userId);

        if (deductError) {
          console.error("Deduct interview error:", deductError);
          return res.status(500).json({ error: `Failed to update interview quota: ${deductError.message}` });
        }
      }
    }
    
    if (isMock) {
      const mockSessionId = `mock-${Date.now()}`;
      mockSessionCache.set(mockSessionId, {
        interview: {
          role: structuredData.role || 'General Candidate',
          parsed_resume_context: structuredData,
        },
        messages: [],
        createdAt: Date.now()
      });

      return res.json({ 
        message: "Resume processed successfully (Mock Session)", 
        sessionId: mockSessionId,
        data: structuredData 
      });
    }

    // In a real scenario with strict RLS, we might use a service role to insert or the user's token.
    // Since we're in the backend with the service role key, this will bypass RLS and insert correctly.
    const { data: interviewData, error: dbError } = await supabase
      .from('interviews')
      .insert([
        {
          user_id: userId,
          parsed_resume_context: structuredData,
          role: structuredData.role || 'General Candidate',
          status: 'in_progress'
        }
      ])
      .select('id')
      .single();

    if (dbError) {
      console.error("Supabase insert error:", dbError);
      return res.status(500).json({
        error: dbError.message || "Failed to save interview to database",
        details: dbError
      });
    }

    return res.json({ 
      message: "Resume processed successfully", 
      sessionId: interviewData.id,
      data: structuredData 
    });
  } catch (error: any) {
    console.error("Resume upload error:", error);
    try {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
        console.log("Safely cleaned up temp upload file after route failure.");
      }
    } catch (e) {}
    return res.status(500).json({ error: error.message || "Failed to process resume" });
  }
});

// Protected route to delete an interview session
router.delete("/:id", requireAuth, validateIdParam, async (req, res) => {
  try {
    const userId = (req as any).user?.id;
    const interviewId = req.params.id;

    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { error: dbError } = await supabase
      .from('interviews')
      .delete()
      .eq('id', interviewId)
      .eq('user_id', userId);

    if (dbError) {
      throw new Error("Failed to delete interview from database");
    }

    return res.json({ message: "Interview deleted successfully" });
  } catch (error: any) {
    console.error("Delete interview error:", error);
    return res.status(500).json({ error: error.message || "Failed to delete interview" });
  }
});

export default router;
