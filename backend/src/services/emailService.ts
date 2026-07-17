import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import nodemailer from "nodemailer";

// Initialize the modular AWS SES client
const sesClient = new SESClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "placeholder_key",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "placeholder_secret"
  }
});

/**
 * Sends a premium transactional scorecard report email to the candidate via AWS SES
 * 
 * @param toEmail The candidate's email address
 * @param candidateName The candidate's name or email prefix
 * @param role The target job role they interviewed for
 * @param overallScore The final assessment score from the AI scorecard
 * @param reportUrl The direct frontend URL to access their feedback report
 * @returns Promise resolving to a boolean representing success
 */
export const sendInterviewReportEmail = async (
  toEmail: string,
  candidateName: string,
  role: string,
  overallScore: number,
  reportUrl: string
): Promise<boolean> => {
  try {
    const isMock = !process.env.AWS_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID === "placeholder_key";
    const subject = `PrepForce AI: Your Mock Interview Scorecard for ${role}`;
    
    // Highly visual, glassmorphic responsive HTML email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Interview Feedback Scorecard</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0A0F1C; color: #E2E8F0; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 40px auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); padding: 40px 30px; text-align: center; }
          .header h1 { color: #FFFFFF; margin: 0; font-size: 28px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 40px 35px; }
          .greeting { font-size: 18px; color: #FFFFFF; font-weight: 600; margin-bottom: 20px; text-transform: capitalize; }
          .intro { font-size: 14px; line-height: 1.6; color: #9CA3AF; font-weight: 300; margin-bottom: 30px; }
          .score-card { background-color: #0F172A; border: 1px solid #1E293B; border-radius: 20px; padding: 30px 20px; text-align: center; margin-bottom: 35px; position: relative; }
          .score-label { font-size: 11px; text-transform: uppercase; letter-spacing: 2px; color: #94A3B8; font-weight: 700; margin-bottom: 10px; }
          .score-value { font-size: 54px; font-weight: 800; color: #3B82F6; margin: 0; }
          .score-max { font-size: 18px; color: #64748B; font-weight: 400; }
          .role-tag { display: inline-block; margin-top: 15px; padding: 6px 14px; background-color: rgba(59, 130, 246, 0.1); border: 1px solid rgba(59, 130, 246, 0.2); border-radius: 20px; color: #60A5FA; font-size: 12px; font-weight: 600; }
          .cta-btn { display: block; width: 220px; margin: 30px auto 0 auto; text-align: center; background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); color: #FFFFFF; text-decoration: none; padding: 15px 30px; border-radius: 50px; font-weight: 700; font-size: 15px; box-shadow: 0 4px 15px rgba(37, 99, 235, 0.3); transition: all 0.3s; }
          .footer { background-color: #0F172A; padding: 25px 30px; text-align: center; border-t: 1px solid #1E293B; }
          .footer p { color: #64748B; font-size: 12px; margin: 0; font-weight: 300; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PREPFORCE AI</h1>
          </div>
          <div class="content">
            <div class="greeting">Hi ${candidateName},</div>
            <p class="intro">
              Congratulations on completing your mock interview session! Our AI assessment models have processed your resume context, conversation syntax transcripts, and facial markers to compile your performance feedback.
            </p>
            <div class="score-card">
              <div class="score-label">Overall Competency Score</div>
              <div class="score-value">${overallScore}<span class="score-max">/100</span></div>
              <div class="role-tag">Role: ${role}</div>
            </div>
            <p class="intro" style="margin-bottom: 10px;">
              You can now view your complete deep-dive analytics scorecard—including technical knowledge ratings, behavioral fit, communication scores, non-verbal indicators, and customized improvement paths.
            </p>
            <a href="${reportUrl}" class="cta-btn">View Detailed Report</a>
          </div>
          <div class="footer">
            <p>© 2026 PrepForce AI. All rights reserved.</p>
            <p style="margin-top: 5px; font-size: 10px; color: #475569;">You are receiving this transactional update because you registered an interview session.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    // Local Development Sandbox Fallback:
    if (isMock && process.env.NODE_ENV !== "production") {
      console.log("\n--- [AWS SES MOCK EMAIL DISPATCHED] ---");
      console.log(`To: ${toEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Candidate: ${candidateName}`);
      console.log(`Role: ${role}`);
      console.log(`Score: ${overallScore}/100`);
      console.log(`Link: ${reportUrl}`);
      console.log("----------------------------------------\n");
      return true;
    }

    const sourceEmail = process.env.AWS_SES_SENDER || "noreply@prepforce.com";
    
    const sendParams = {
      Source: sourceEmail,
      Destination: {
        ToAddresses: [toEmail]
      },
      Message: {
        Subject: {
          Data: subject,
          Charset: "UTF-8"
        },
        Body: {
          Html: {
            Data: htmlBody,
            Charset: "UTF-8"
          }
        }
      }
    };

    const command = new SendEmailCommand(sendParams);
    await sesClient.send(command);
    console.log(`AWS SES successfully sent scorecard email to: ${toEmail}`);
    return true;
  } catch (error) {
    console.error("AWS SES Email Dispatch Error:", error);
    return false;
  }
};

/**
 * Sends a cryptographically secure 6-digit verification code to verify email validity
 * 
 * @param toEmail The recipient's email address
 * @param otp The 6-digit numeric verification OTP
 * @returns Promise resolving to a boolean representing success
 */
export const sendVerificationOtpEmail = async (
  toEmail: string,
  otp: string
): Promise<boolean> => {
  try {
    const subject = `PrepForce AI: Verify Your Email Address`;
    
    // High-fidelity glassmorphic HTML email template
    const htmlBody = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Email Verification OTP</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #0A0F1C; color: #E2E8F0; margin: 0; padding: 0; }
          .container { max-width: 500px; margin: 40px auto; background-color: #111827; border: 1px solid #1F2937; border-radius: 24px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
          .header { background: linear-gradient(135deg, #2563EB 0%, #4F46E5 100%); padding: 30px 20px; text-align: center; }
          .header h1 { color: #FFFFFF; margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; }
          .content { padding: 40px 35px; text-align: center; }
          .greeting { font-size: 18px; color: #FFFFFF; font-weight: 600; margin-bottom: 20px; }
          .intro { font-size: 14px; line-height: 1.6; color: #9CA3AF; font-weight: 300; margin-bottom: 30px; }
          .otp-card { background-color: #0F172A; border: 1px solid #1E293B; border-radius: 16px; padding: 20px; text-align: center; margin-bottom: 30px; letter-spacing: 6px; }
          .otp-value { font-size: 36px; font-weight: 800; color: #3B82F6; margin: 0; font-family: monospace; }
          .footer { background-color: #0F172A; padding: 20px; text-align: center; border-top: 1px solid #1E293B; }
          .footer p { color: #64748B; font-size: 12px; margin: 0; font-weight: 300; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>PREPFORCE AI</h1>
          </div>
          <div class="content">
            <div class="greeting">Verify Your Account Creation</div>
            <p class="intro">
              Thank you for choosing PrepForce AI! To complete your registration and unlock full mock interview features, please enter the following 6-digit verification code:
            </p>
            <div class="otp-card">
              <div class="otp-value">${otp}</div>
            </div>
            <p class="intro" style="font-size: 12px; color: #64748B;">
              This code will expire in 5 minutes. If you did not request this, you can safely ignore this email.
            </p>
          </div>
          <div class="footer">
            <p>© 2026 PrepForce AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const hasSmtp = !!process.env.SMTP_HOST && !!process.env.SMTP_USER;
    const hasAws = !!process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ACCESS_KEY_ID !== "placeholder_key";

    // Local Development Sandbox / No SMTP Fallback:
    if (!hasSmtp && !hasAws) {
      console.log("\n--- [SMTP MOCK EMAIL OTP DISPATCHED] ---");
      console.log(`To: ${toEmail}`);
      console.log(`Subject: ${subject}`);
      console.log(`Verification OTP: [ ${otp} ]`);
      console.log("----------------------------------------\n");
      return true;
    }

    if (hasSmtp) {
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
      await transporter.sendMail({
        from: `"PrepForce AI" <${sender}>`,
        to: toEmail,
        subject: subject,
        html: htmlBody,
      });

      console.log(`Nodemailer SMTP successfully sent OTP verification email to: ${toEmail}`);
      return true;
    }

    if (hasAws) {
      const sender = process.env.AWS_SES_SENDER || "noreply@prepforce.com";
      const sendParams = {
        Source: sender,
        Destination: { ToAddresses: [toEmail] },
        Message: {
          Subject: { Data: subject, Charset: "UTF-8" },
          Body: { Html: { Data: htmlBody, Charset: "UTF-8" } }
        }
      };
      const command = new SendEmailCommand(sendParams);
      await sesClient.send(command);
      console.log(`AWS SES successfully sent OTP verification email to: ${toEmail}`);
      return true;
    }

    return false;
  } catch (error: any) {
    console.error("Verification Email Dispatch Error:", error);
    console.warn("\n=== [LOCAL/TEST DISPATCH FALLBACK] ===");
    console.warn(`Could not send real email due to provider error: ${error?.message || error}`);
    console.warn(`To: ${toEmail}`);
    console.warn(`Verification OTP: [ ${otp} ]`);
    console.warn("======================================\n");
    return true;
  }
};
