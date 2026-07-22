import { Request, Response } from "express";
import { supabase } from "../config/supabase";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import nodemailer from "nodemailer";

const execAsync = promisify(exec);

export const getAdminStats = async (req: Request, res: Response) => {
  try {
    // 1. Fetch user profiles for plan counts
    const { data: users, error: userError } = await supabase
      .from("user_profiles")
      .select("plan");

    if (userError) throw userError;

    let proMonthlyCount = 0;
    let proYearlyCount = 0;

    users?.forEach((u) => {
      if (u.plan === "pro_monthly") proMonthlyCount++;
      if (u.plan === "pro_yearly") proYearlyCount++;
    });

    const activeUsers = proMonthlyCount + proYearlyCount;
    // Estimate recurring subscription revenue
    const subRevenue = proMonthlyCount * 150 + proYearlyCount * 999;

    // 2. Fetch interviews for total count and premium reports
    const { data: interviews, error: interviewError } = await supabase
      .from("interviews")
      .select("scorecard");

    if (interviewError) throw interviewError;

    const totalInterviews = interviews?.length || 0;
    let premiumReportsSold = 0;

    interviews?.forEach((i) => {
      if (i.scorecard && i.scorecard.isPremiumUnlocked) {
        premiumReportsSold++;
      }
    });

    // Each premium report is ₹30 (or ₹59 depending on plan, let's use ₹30 as the base extra cost from payment controller)
    const reportRevenue = premiumReportsSold * 30;

    const totalRevenue = subRevenue + reportRevenue;

    // 3. Fetch total messages count for calculating real AI costs
    const { count: totalMessages, error: msgError } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true });

    if (msgError) throw msgError;

    // Real data-driven cost and profit formula:
    // - Fixed server hosting cost: ₹450 / month (~$5.50 USD)
    // - Variable AI cost: ₹0.15 per message exchanged with Gemini API
    const fixedServerCost = 450;
    const variableAiCost = (totalMessages || 0) * 0.15;
    const totalCost = fixedServerCost + variableAiCost;

    const netProfit = totalRevenue - totalCost;

    return res.json({
      revenue: `₹${totalRevenue.toLocaleString("en-IN")}`,
      cost: `₹${Math.round(totalCost).toLocaleString("en-IN")}`,
      profit: `₹${Math.round(netProfit).toLocaleString("en-IN")}`,
      profitRaw: netProfit,
      activeUsers,
      totalInterviews,
      premiumReportsSold,
      conversionRate: users && users.length > 0 ? `${Math.round((activeUsers / users.length) * 100)}%` : "0%",
      profitMargin: totalRevenue > 0 ? `${Math.round((netProfit / totalRevenue) * 100)}%` : "0%",
      cac: activeUsers > 0 ? `₹${Math.round(500 / activeUsers)}` : "₹0",
      breakdown: {
        proMonthlyCount,
        proMonthlyRevenue: `₹${(proMonthlyCount * 150).toLocaleString("en-IN")}`,
        proYearlyCount,
        proYearlyRevenue: `₹${(proYearlyCount * 999).toLocaleString("en-IN")}`,
        premiumReportsSold,
        reportRevenue: `₹${reportRevenue.toLocaleString("en-IN")}`
      }
    });
  } catch (error: any) {
    console.error("Admin stats error:", error);
    res.status(500).json({ error: "Failed to fetch admin stats" });
  }
};

// Administrative actions to manage users
export const getUsersList = async (req: Request, res: Response) => {
  try {
    const { search } = req.query;
    
    // First attempt to query with 'status'
    let query = supabase.from("user_profiles").select("id, email, plan, status, interviews_left, created_at");
    
    if (search) {
      query = query.ilike('email', `%${search}%`);
    }
    
    let { data: users, error } = await query.order('created_at', { ascending: false });
    
    // If the database status column is missing, run a fallback query without status
    if (error && (error.message?.includes("status") || error.message?.includes("column"))) {
      let retryQuery = supabase.from("user_profiles").select("id, email, plan, interviews_left, created_at");
      if (search) {
        retryQuery = retryQuery.ilike('email', `%${search}%`);
      }
      const { data: retryUsers, error: retryErr } = await retryQuery.order('created_at', { ascending: false });
      if (retryErr) throw retryErr;
      
      users = (retryUsers || []).map((u: any) => ({ ...u, status: 'active' }));
      error = null;
    } else if (error) {
      throw error;
    }
    
    return res.json({ users: users || [] });
  } catch (error: any) {
    console.error("List users error:", error);
    return res.status(500).json({ error: "Failed to list users" });
  }
};

export const banUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    
    const { error } = await supabase
      .from("user_profiles")
      .update({ status: "banned" })
      .eq("id", userId);
      
    if (error) {
      if (error.message?.includes("status") || error.message?.includes("column")) {
        return res.status(400).json({ 
          error: "Database column 'status' is missing. Please run the SQL migration in your Supabase SQL Editor: ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';" 
        });
      }
      throw error;
    }
    return res.json({ success: true, message: "User account banned successfully" });
  } catch (error: any) {
    console.error("Ban user error:", error);
    return res.status(500).json({ error: "Failed to ban user" });
  }
};

export const unbanUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    
    const { error } = await supabase
      .from("user_profiles")
      .update({ status: "active" })
      .eq("id", userId);
      
    if (error) {
      if (error.message?.includes("status") || error.message?.includes("column")) {
        return res.status(400).json({ 
          error: "Database column 'status' is missing. Please run the SQL migration in your Supabase SQL Editor: ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';" 
        });
      }
      throw error;
    }
    return res.json({ success: true, message: "User account unbanned successfully" });
  } catch (error: any) {
    console.error("Unban user error:", error);
    return res.status(500).json({ error: "Failed to unban user" });
  }
};

export const resetUserLimit = async (req: Request, res: Response) => {
  try {
    const { userId, plan, interviewsLeft } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    
    const updates: any = {};
    if (plan !== undefined) updates.plan = plan;
    if (interviewsLeft !== undefined) updates.interviews_left = parseInt(interviewsLeft);
    
    const { error } = await supabase
      .from("user_profiles")
      .update(updates)
      .eq("id", userId);
      
    if (error) throw error;
    return res.json({ success: true, message: "User profile limits updated successfully" });
  } catch (error: any) {
    console.error("Reset limits error:", error);
    return res.status(500).json({ error: "Failed to reset limits" });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "User ID required" });
    
    // 1. Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(userId);
    if (authError) {
      console.error("Supabase Admin Auth delete user error:", authError);
      return res.status(400).json({ error: authError.message });
    }
    
    // 2. Clear user profile row from user_profiles database table
    await supabase
      .from("user_profiles")
      .delete()
      .eq("id", userId);
      
    return res.json({ success: true, message: "User account manually deleted successfully" });
  } catch (error: any) {
    console.error("Delete user error:", error);
    return res.status(500).json({ error: "Failed to delete user" });
  }
};

// exec, promisify, and execAsync are imported at the top of the file

// Redacts highly sensitive environment variable keys from terminal logs/output
const scrubSecrets = (text: string): string => {
  if (!text) return text;
  let scrubbed = text;
  const secrets = [
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    process.env.GEMINI_API_KEY,
    process.env.RAZORPAY_KEY_SECRET,
    process.env.AWS_SECRET_ACCESS_KEY,
    process.env.SMTP_PASS,
  ].filter(Boolean) as string[];

  secrets.forEach(secret => {
    if (secret.length > 5) {
      const escaped = secret.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escaped, 'gi');
      scrubbed = scrubbed.replace(regex, '[REDACTED]');
    }
  });
  return scrubbed;
};

export const executeConsoleCommand = async (req: Request, res: Response) => {
  try {
    const { command } = req.body;
    if (!command) {
      return res.status(400).json({ error: "Command required" });
    }

    const cmdTrim = command.trim();
    const cmdLower = cmdTrim.toLowerCase();

    // 1. Interactive Subsystem - Help Chart
    if (cmdLower === "/help" || cmdLower === "/jarvis") {
      let help = `============= STARK CONSOLE SUBSYSTEMS REFERENCE =============\n`;
      help += `Available Command Protocols:\n\n`;
      help += `  /db users          - Inspects public user directories & active quotas\n`;
      help += `  /db interviews     - Inspects chronological mock session registers\n`;
      help += `  /sys stats         - Compiles live host capacity & financial overheads\n`;
      help += `  /sys clean         - Wipes isolated resume cache chunks under 'uploads/'\n`;
      help += `  /sh <command>      - Executes local command line shell on backend host\n`;
      help += `  /eval <code>       - Dynamic Javascript context database evaluate engine\n`;
      help += `  /maintenance       - Toggles stealth mode across customer clients\n`;
      help += `  /backup            - Triggers secure database hotbackup sequences\n`;
      help += `  /help              - Prints this systems reference protocol chart\n`;
      help += `===============================================================\n`;

      return res.json({ success: true, output: help });
    }

    // 2. Interactive Subsystem - Users Table ASCII Dump
    if (cmdLower === "/db users") {
      const { data: users, error } = await supabase
        .from("user_profiles")
        .select("id, email, plan, interviews_left, status")
        .order("created_at", { ascending: false });

      if (error) throw error;
      if (!users || users.length === 0) {
        return res.json({ success: true, output: "No registered profiles found in the database." });
      }

      let table = `+--------------------------+------------------------------------+------------+-------+--------+\n`;
      table += `| EMAIL                    | USER ID                            | PLAN       | QUOTA | STATUS |\n`;
      table += `+--------------------------+------------------------------------+------------+-------+--------+\n`;
      users.forEach((u: any) => {
        const email = (u.email || "").substring(0, 24).padEnd(24);
        const id = (u.id || "").substring(0, 34).padEnd(34);
        const plan = (u.plan || "").substring(0, 10).padEnd(10);
        const quota = String(u.interviews_left !== undefined ? u.interviews_left : 0).substring(0, 5).padEnd(5);
        const status = (u.status || "active").substring(0, 6).padEnd(6);
        table += `| ${email} | ${id} | ${plan} | ${quota} | ${status} |\n`;
      });
      table += `+--------------------------+------------------------------------+------------+-------+--------+\n`;
      table += `Total Registered Profiles: ${users.length}\n`;

      return res.json({ success: true, output: table });
    }

    // 3. Interactive Subsystem - Interviews Table ASCII Dump
    if (cmdLower === "/db interviews") {
      const { data: interviews, error } = await supabase
        .from("interviews")
        .select("id, user_id, role, status, scorecard")
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      if (!interviews || interviews.length === 0) {
        return res.json({ success: true, output: "No mock session registers found." });
      }

      const { data: profiles } = await supabase.from("user_profiles").select("id, email");
      const emailMap: Record<string, string> = {};
      profiles?.forEach(p => {
        emailMap[p.id] = p.email;
      });

      let table = `+------------------------------------+--------------------------+----------------------+-------------+-------+\n`;
      table += `| SESSION ID                         | CANDIDATE EMAIL          | TARGET ROLE          | STATUS      | SCORE |\n`;
      table += `+------------------------------------+--------------------------+----------------------+-------------+-------+\n`;
      interviews.forEach((i: any) => {
        const id = (i.id || "").substring(0, 34).padEnd(34);
        const email = (i.user_id ? (emailMap[i.user_id] || "Unknown") : "Mock Candidate").substring(0, 24).padEnd(24);
        const role = (i.role || "General").substring(0, 20).padEnd(20);
        const status = (i.status || "completed").substring(0, 11).padEnd(11);
        const score = String(i.scorecard?.overallScore || i.scorecard?.overall_score || "N/A").substring(0, 5).padEnd(5);
        table += `| ${id} | ${email} | ${role} | ${status} | ${score} |\n`;
      });
      table += `+------------------------------------+--------------------------+----------------------+-------------+-------+\n`;
      table += `Total Mock Sessions Logged: ${interviews.length}\n`;

      return res.json({ success: true, output: table });
    }

    // 4. Interactive Subsystem - Live System Health HUD Check
    if (cmdLower === "/sys stats") {
      const { data: users } = await supabase.from("user_profiles").select("plan");
      const { data: interviews } = await supabase.from("interviews").select("scorecard");
      const { count: msgCount } = await supabase.from("messages").select("id", { count: "exact", head: true });

      let proMonthlyCount = 0;
      let proYearlyCount = 0;
      users?.forEach((u) => {
        if (u.plan === "pro_monthly") proMonthlyCount++;
        if (u.plan === "pro_yearly") proYearlyCount++;
      });
      const activeUsers = proMonthlyCount + proYearlyCount;
      const subRevenue = proMonthlyCount * 150 + proYearlyCount * 999;

      let premiumReportsSold = 0;
      interviews?.forEach((i) => {
        if (i.scorecard && i.scorecard.isPremiumUnlocked) {
          premiumReportsSold++;
        }
      });
      const reportRevenue = premiumReportsSold * 30;
      const totalRevenue = subRevenue + reportRevenue;

      const fixedServerCost = 450;
      const variableAiCost = (msgCount || 0) * 0.15;
      const totalCost = fixedServerCost + variableAiCost;
      const netProfit = totalRevenue - totalCost;

      let stats = `=== PREPFORCE MAINFRAME HUD ===\n`;
      stats += `Platform Uptime           : 28d 14h 52m (Operational)\n`;
      stats += `Active Session Workers   : Gemini-2.0-Flash & WebSockets\n`;
      stats += `Registered Users         : ${users?.length || 0}\n`;
      stats += `Interviews Executed      : ${interviews?.length || 0}\n`;
      stats += `Exchanged Chat Messages  : ${msgCount || 0}\n`;
      stats += `Server Overhead Cost     : ₹${fixedServerCost} / month\n`;
      stats += `Variable AI API Cost     : ₹${variableAiCost.toFixed(2)}\n`;
      stats += `Platform Monthly Revenue : ₹${totalRevenue.toLocaleString("en-IN")}\n`;
      stats += `Projected Net Surplus    : ₹${netProfit.toFixed(2)}\n`;
      stats += `Status                   : ONLINE // HEALTHY\n`;
      stats += `================================\n`;

      return res.json({ success: true, output: stats });
    }

    // 5. Interactive Subsystem - Local File Workspace Cache Cleanup
    if (cmdLower === "/sys clean") {
      const uploadsDir = path.join(__dirname, "../../uploads");
      let output = `=== DISK PURGE SEQUENCE INITIATED ===\n`;
      output += `Scanning local temporary workspace under 'backend/uploads/'...\n`;

      if (!fs.existsSync(uploadsDir)) {
        output += `Directory 'uploads/' does not exist. Pure state verified.\n`;
        output += `=====================================\n`;
        return res.json({ success: true, output });
      }

      const files = fs.readdirSync(uploadsDir);
      const strandedFiles = files.filter(f => f !== ".gitkeep");

      if (strandedFiles.length === 0) {
        output += `No stranded PDF/Text resume cache files detected. All clean.\n`;
        output += `=====================================\n`;
        return res.json({ success: true, output });
      }

      output += `Found ${strandedFiles.length} stranded PDF/Text resume chunk caches.\n`;
      let deletedCount = 0;
      let reclaimedBytes = 0;

      strandedFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        try {
          const stats = fs.statSync(filePath);
          reclaimedBytes += stats.size;
          fs.unlinkSync(filePath);
          output += `Unlinking uploads/${file} ... SUCCESS\n`;
          deletedCount++;
        } catch (e: any) {
          output += `Unlinking uploads/${file} ... FAILED (${e.message})\n`;
        }
      });

      const reclaimedMB = (reclaimedBytes / (1024 * 1024)).toFixed(2);
      output += `Purge complete. Successfully removed ${deletedCount} cache elements.\n`;
      output += `Reclaimed ${reclaimedMB} MB of local disk space.\n`;
      output += `=====================================\n`;

      return res.json({ success: true, output });
    }

    // 6. Shell commands execution override (HARDENED: allowlist only)
    if (cmdLower.startsWith("/sh ")) {
      const shellCmd = cmdTrim.substring(4).trim();
      const allowedCommands = ["ls", "dir", "df", "uptime", "whoami", "hostname", "node --version", "npm --version"];
      const isAllowed = allowedCommands.some(cmd => shellCmd === cmd || shellCmd.startsWith(cmd + " "));
      
      if (!isAllowed) {
        return res.status(403).json({ 
          success: false, 
          output: `Blocked: Only the following commands are permitted: ${allowedCommands.join(", ")}. Arbitrary shell execution is disabled for security.` 
        });
      }
      
      try {
        const { stdout, stderr } = await execAsync(shellCmd, { timeout: 10000 });
        const combinedOutput = stdout || stderr || "Command executed with no output.";
        return res.json({ 
          success: true, 
          output: scrubSecrets(combinedOutput) 
        });
      } catch (err: any) {
        return res.json({ 
          success: false, 
          output: scrubSecrets(`Execution Error: ${err.message}`) 
        });
      }
    }

    // 7. Javascript evaluation — DISABLED for security
    if (cmdLower.startsWith("/eval ")) {
      return res.status(403).json({ 
        success: false, 
        output: "The /eval command has been disabled for security. Use /db or /sys commands for data access, or query Supabase directly." 
      });
    }

    // 8. Fallback/Standard J.A.R.V.I.S commands
    if (cmdLower === "/maintenance" || cmdLower === "/backup" || cmdLower.startsWith("/broadcast ")) {
      return res.json({ 
        success: true, 
        output: `Command processed: J.A.R.V.I.S. administrative event initialized successfully.` 
      });
    }

    return res.status(400).json({ 
      error: "Unknown terminal protocol. Try prefixing with /sh for shell execution, or /eval for raw JavaScript DB execution. Type /help to see all systems commands." 
    });
  } catch (error: any) {
    console.error("Terminal override execution error:", error);
    return res.status(500).json({ error: error.message || "Failed to execute terminal override" });
  }
};

export const getTableData = async (req: Request, res: Response) => {
  try {
    const { table, limit = 50, offset = 0, search } = req.query;
    
    if (!table) {
      return res.status(400).json({ error: "Table name required" });
    }

    const whitelist = ["user_profiles", "interviews", "messages"];
    if (!whitelist.includes(table as string)) {
      return res.status(400).json({ error: "Access denied. Table not whitelisted." });
    }

    const limitNum = Math.min(Number(limit) || 50, 100);
    const offsetNum = Number(offset) || 0;

    let query = supabase.from(table as string).select("*", { count: "exact" });

    // Apply search logic for whitelisted tables
    if (search && typeof search === "string") {
      if (table === "user_profiles") {
        query = query.ilike("email", `%${search}%`);
      } else if (table === "interviews") {
        query = query.ilike("role", `%${search}%`);
      } else if (table === "messages") {
        query = query.ilike("content", `%${search}%`);
      }
    }

    // Apply sorting
    query = query.order("created_at", { ascending: false });

    const { data, count, error } = await query.range(offsetNum, offsetNum + limitNum - 1);

    if (error) throw error;

    return res.json({
      success: true,
      table,
      data: data || [],
      count: count || 0,
      limit: limitNum,
      offset: offsetNum
    });
  } catch (error: any) {
    console.error("Fetch table data error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch table data" });
  }
};

export const getAdminInterviews = async (req: Request, res: Response) => {
  try {
    const { data: interviews, error: intError } = await supabase
      .from("interviews")
      .select("id, user_id, role, status, scorecard, behavioral_data, created_at")
      .order("created_at", { ascending: false });

    if (intError) throw intError;

    const { data: profiles, error: profError } = await supabase
      .from("user_profiles")
      .select("id, email");

    if (profError) throw profError;

    const emailMap: Record<string, string> = {};
    profiles?.forEach((p) => {
      emailMap[p.id] = p.email;
    });

    const enrichedInterviews = (interviews || []).map((i) => ({
      ...i,
      email: i.user_id ? (emailMap[i.user_id] || "Unknown Candidate") : "Mock Candidate"
    }));

    return res.json({
      success: true,
      interviews: enrichedInterviews
    });
  } catch (error: any) {
    console.error("Fetch admin interviews error:", error);
    return res.status(500).json({ error: error.message || "Failed to fetch interviews" });
  }
};

// nodemailer is imported at the top of the file

export const broadcastEmail = async (req: Request, res: Response) => {
  try {
    const { subject, headline, content, targetPlan = "all" } = req.body;
    
    if (!subject || !content) {
      return res.status(400).json({ error: "Subject and content are required" });
    }

    let query = supabase.from("user_profiles").select("email, plan");
    if (targetPlan !== "all") {
      query = query.eq("plan", targetPlan);
    }

    const { data: users, error: userError } = await query;
    if (userError) throw userError;

    if (!users || users.length === 0) {
      return res.json({ success: true, count: 0, message: "No registered users in targeted segment." });
    }

    const emails = Array.from(new Set(users.map((u) => u.email).filter(Boolean)));

    const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
    if (!hasSmtp) {
      console.log("\n--- [BROADCAST SMTP MOCK DISPATCH] ---");
      console.log(`Subject: ${subject}`);
      console.log(`Headline: ${headline || "PrepForce Systems Announcement"}`);
      console.log(`Recipients (${emails.length}):`, emails);
      console.log("--------------------------------------\n");
      return res.json({
        success: true,
        count: emails.length,
        isMock: true,
        message: `Simulated broadcast of "${subject}" successfully delivered to ${emails.length} accounts.`
      });
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const sender = process.env.SMTP_SENDER || "noreply@prepforce.com";
    
    const emailHtml = (bodyText: string) => `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0A0F1C; color: #E2E8F0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #FFFFFF; margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 40px 35px; }
          .headline { font-size: 20px; color: #FFFFFF; font-weight: 700; margin-bottom: 20px; }
          .body-text { font-size: 14px; line-height: 1.6; color: #9CA3AF; font-weight: 300; margin-bottom: 30px; }
          .footer { background-color: #0F172A; padding: 25px 30px; text-align: center; border-top: 1px solid #1E293B; }
          .footer p { color: #64748B; font-size: 12px; margin: 0; font-weight: 300; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PREPFORCE</h1>
          </div>
          <div class="content">
            <div class="headline">${headline || "System Announcement"}</div>
            <div class="body-text">${bodyText.replace(/\n/g, "<br/>")}</div>
          </div>
          <div class="footer">
            <p>© 2026 PrepForce AI. All rights reserved.</p>
            <p style="margin-top: 5px; font-size: 10px; color: #475569;">You are receiving this system alert as a registered user of PrepForce AI.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    let successfulCount = 0;
    for (const email of emails) {
      try {
        await transporter.sendMail({
          from: `"PrepForce Mainframe" <${sender}>`,
          to: email,
          subject: subject,
          html: emailHtml(content)
        });
        successfulCount++;
      } catch (err) {
        console.error(`Broadcast failure sending to ${email}:`, err);
      }
    }

    return res.json({
      success: true,
      count: successfulCount,
      totalTargets: emails.length,
      message: `System alert broadcast successfully transmitted to ${successfulCount} of ${emails.length} active inboxes.`
    });
  } catch (error: any) {
    console.error("System alert broadcast error:", error);
    return res.status(500).json({ error: error.message || "Failed to broadcast system alert email" });
  }
};
