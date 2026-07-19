import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import { sendVerificationOtpEmail } from "../services/emailService";

interface VerificationPending {
  otp: string;
  expiresAt: number;
  verifying?: boolean;
}

// In-memory verification OTP cache (expires in 5 minutes)
const verificationCache = new Map<string, VerificationPending>();

// Periodic cleanup: sweep expired OTP entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of verificationCache.entries()) {
    if (now > value.expiresAt) {
      verificationCache.delete(key);
    }
  }
}, 5 * 60 * 1000);

// Strict email syntax regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Handles sending validation OTP via SMTP/SES
 */
export const sendVerificationOtp = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email } = req.body;
    
    if (!email) {
      res.status(400).json({ error: "Email is required." });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Strict syntax validation
    if (!EMAIL_REGEX.test(cleanEmail)) {
      res.status(400).json({ error: "Invalid email format. Please provide a valid email." });
      return;
    }

    // 2. Check if user already exists in user_profiles or Auth
    const { data: existingProfile } = await supabase
      .from("user_profiles")
      .select("id")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      res.status(400).json({ error: "Email is already registered. Please log in instead." });
      return;
    }

    // Double check auth.users to prevent conflicts
    const { data: authList } = await supabase.auth.admin.listUsers();
    const existingAuthUser = authList?.users?.find(u => u.email?.toLowerCase() === cleanEmail);
    if (existingAuthUser) {
      res.status(400).json({ error: "Email is already registered in Auth. Please log in instead." });
      return;
    }

    // 3. Generate 6-digit numeric OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity

    // Cache the OTP mapped to their email
    verificationCache.set(cleanEmail, { otp, expiresAt });

    // 4. Dispatch Email
    const emailSent = await sendVerificationOtpEmail(cleanEmail, otp);

    if (!emailSent) {
      res.status(500).json({ error: "Failed to dispatch verification email. Please try again later." });
      return;
    }

    res.status(200).json({ success: true, message: "Verification OTP successfully dispatched to your email." });
  } catch (error: any) {
    console.error("Error in sendVerificationOtp:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * Verifies OTP and completes creation of Supabase Auth account
 */
export const verifyOtpAndCreateAccount = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, otp } = req.body;

    if (!email || !password || !otp) {
      res.status(400).json({ error: "Email, password, and OTP are required fields." });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();

    // 1. Check pending verification cache
    const pending = verificationCache.get(cleanEmail);
    if (!pending) {
      res.status(400).json({ error: "No verification pending for this email. Please request a new OTP." });
      return;
    }

    // 1b. Atomicity guard: prevent duplicate concurrent verifications
    if (pending.verifying) {
      res.status(409).json({ error: "Verification already in progress. Please wait." });
      return;
    }
    pending.verifying = true;

    // 2. Check expiration
    if (Date.now() > pending.expiresAt) {
      verificationCache.delete(cleanEmail);
      res.status(400).json({ error: "Verification OTP has expired. Please request a new OTP." });
      return;
    }

    // 3. Verify OTP code match
    if (pending.otp !== otp.trim()) {
      pending.verifying = false; // Release lock on mismatch
      res.status(400).json({ error: "Invalid verification code. Please check your email and try again." });
      return;
    }

    // OTP Verified! Clear pending state
    verificationCache.delete(cleanEmail);

    // 4. Create user in Supabase Auth via Service Role (Auto-Confirming Email)
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: cleanEmail,
      password: password,
      email_confirm: true // Since we already verified it via SMTP OTP!
    });

    if (authError) {
      console.error("Supabase Admin Auth creation failed:", authError);
      res.status(400).json({ error: authError.message });
      return;
    }

    // 5. Auto-provision user_profiles table entry
    if (authUser?.user) {
      const { error: profileErr } = await supabase
        .from("user_profiles")
        .upsert({
          id: authUser.user.id,
          email: cleanEmail,
          plan: "free",
          interviews_left: 2,
          role: "user",
          status: "active"
        }, { onConflict: "id" });

      if (profileErr) {
        console.error("Failed to provision user_profiles record:", profileErr);
      }
    }

    res.status(200).json({
      success: true,
      message: "Account verified and created successfully!",
      user: authUser.user
    });
  } catch (error: any) {
    console.error("Error in verifyOtpAndCreateAccount:", error);
    res.status(500).json({ error: "Internal server error." });
  }
};
