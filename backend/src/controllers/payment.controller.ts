import { Request, Response } from "express";
import Razorpay from "razorpay";
import crypto from "crypto";
import dotenv from "dotenv";
import { supabase } from "../config/supabase";

dotenv.config();

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_placeholder",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder",
});

// Create Razorpay Order
export const createOrder = async (req: Request, res: Response) => {
  try {
    const { planId, userId } = req.body;

    let amount = 0; // Amount in paise (1 INR = 100 paise)
    const shortUserId = userId ? userId.substring(0, 8) : "anon";
    let receipt = `rcpt_${shortUserId}_${Date.now()}`.substring(0, 40);

    // Map your plans to amounts
    if (planId === "pro_plan_monthly") {
      amount = 150 * 100; // 150 INR
    } else if (planId === "pro_plan_yearly") {
      amount = 999 * 100; // 999 INR
    } else if (planId === "extra_interview_20") {
      amount = 20 * 100; // 20 INR
    } else if (planId === "premium_report") {
      amount = 30 * 100; // 30 INR
    } else {
      return res.status(400).json({ error: "Invalid plan ID" });
    }

    const options = {
      amount,
      currency: "INR",
      receipt,
      notes: {
        userId: userId || "anonymous",
        planId: planId,
        sessionId: req.body.sessionId || "",
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({ order });
  } catch (error: any) {
    console.error("Razorpay Create Order Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Verify Razorpay Payment Signature
export const verifyPayment = async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    const sign = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSign = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET || "rzp_secret_placeholder")
      .update(sign.toString())
      .digest("hex");

    if (razorpay_signature === expectedSign) {
      console.log(`Payment successfully verified! Order: ${razorpay_order_id}`);
      
      // Fetch order from Razorpay to get the notes
      const order = await razorpay.orders.fetch(razorpay_order_id);
      const { userId, planId, sessionId } = order.notes as any;

      if (planId === "premium_report" && sessionId) {
        // Handle premium report unlock (independent of user plan)
        const { data: interview } = await supabase.from('interviews').select('scorecard').eq('id', sessionId).single();
        if (interview && interview.scorecard) {
          const updatedScorecard = { ...interview.scorecard, isPremiumUnlocked: true };
          await supabase.from('interviews').update({ scorecard: updatedScorecard }).eq('id', sessionId);
        }
      } else if (userId && userId !== "anonymous") {
        if (planId === "pro_plan_monthly" || planId === "pro_plan_yearly") {
          // Upgrade to Pro plan and add some base interviews
          await supabase.from('user_profiles').update({
            plan: planId === "pro_plan_monthly" ? "pro_monthly" : "pro_yearly",
            interviews_left: planId === "pro_plan_monthly" ? 70 : 900 // 70/mo or 900/yr
          }).eq('id', userId);
        } else if (planId === "extra_interview_20") {
          // Fetch current and increment
          const { data: user } = await supabase.from('user_profiles').select('interviews_left').eq('id', userId).single();
          const currentLeft = user?.interviews_left || 0;
          await supabase.from('user_profiles').update({
            interviews_left: currentLeft + 1
          }).eq('id', userId);
        }
      }

      return res.status(200).json({ success: true, message: "Payment verified successfully" });
    } else {
      return res.status(400).json({ success: false, error: "Invalid signature sent!" });
    }
  } catch (error: any) {
    console.error("Razorpay Verify Error:", error);
    res.status(500).json({ error: error.message });
  }
};

// Handle free or included unlocks
export const unlockFreeReport = async (req: Request, res: Response) => {
  try {
    const { userId, sessionId } = req.body;
    if (!userId || !sessionId) return res.status(400).json({ error: "Missing required fields" });

    // 1. Fetch user profile
    const { data: userProfile } = await supabase.from('user_profiles').select('plan').eq('id', userId).single();
    if (!userProfile) return res.status(404).json({ error: "User not found" });

    // 2. If free plan, check how many premium reports they've unlocked
    if (userProfile.plan === 'free') {
      const { data: interviews } = await supabase.from('interviews').select('scorecard').eq('user_id', userId);
      const unlockedCount = interviews?.filter(i => i.scorecard?.isPremiumUnlocked).length || 0;
      
      if (unlockedCount > 0) {
         return res.status(403).json({ error: "You have already used your 1 free Deep-Dive." });
      }
    }

    // 3. Unlock the report
    const { data: interview } = await supabase.from('interviews').select('scorecard').eq('id', sessionId).single();
    if (!interview || !interview.scorecard) {
      return res.status(404).json({ error: "Report not found or not completed" });
    }

    const updatedScorecard = { ...interview.scorecard, isPremiumUnlocked: true };
    await supabase.from('interviews').update({ scorecard: updatedScorecard }).eq('id', sessionId);

    return res.json({ success: true, message: "Report unlocked successfully!" });
  } catch (error: any) {
    console.error("Unlock Free Report Error:", error);
    res.status(500).json({ error: error.message });
  }
};
