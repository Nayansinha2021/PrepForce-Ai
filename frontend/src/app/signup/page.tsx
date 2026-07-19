"use client";

import { motion } from "framer-motion";
import { UserPlus, Mail, Lock, AlertCircle, KeyRound, ShieldCheck, RefreshCw } from "lucide-react";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState("");
  const [verifying, setVerifying] = useState(false);
  const [timer, setTimer] = useState(300); // 5 minutes validity countdown
  const [resendCooldown, setResendCooldown] = useState(60); // 60 seconds resend cooldown
  const router = useRouter();

  // Countdown timers for OTP validity and resend cooldown
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (step === 'otp') {
      interval = setInterval(() => {
        setTimer((prev) => (prev > 0 ? prev - 1 : 0));
        setResendCooldown((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const cleanEmail = email.toLowerCase().trim();

    if (!EMAIL_REGEX.test(cleanEmail)) {
      toast.error("Please enter a valid email address");
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters long");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initiate verification");
      }

      toast.success("Verification code sent to your email!");
      setStep('otp');
      setTimer(300); // reset 5m validity
      setResendCooldown(60); // 60s cooldown for resend button
    } catch (err: any) {
      toast.error(err.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length !== 6) {
      toast.error("Please enter a 6-digit verification code.");
      return;
    }

    setVerifying(true);
    const cleanEmail = email.toLowerCase().trim();

    try {
      // 1. Verify OTP and create account on the backend
      const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password, otp: otp.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed");
      }

      // 2. Perform direct sign in with Supabase on the frontend to set session cookies
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (signInError) {
        throw new Error("Account created, but automatic sign-in failed. Please login manually.");
      }

      setSuccess(true);
      toast.success("Email verified and account successfully created!");
      setTimeout(() => {
        router.push("/dashboard");
      }, 2000);
    } catch (err: any) {
      toast.error(err.message || "OTP verification failed");
    } finally {
      setVerifying(false);
    }
  };

  const handleResendOtp = async () => {
    setLoading(true);
    const cleanEmail = email.toLowerCase().trim();
    try {
      const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to resend code");
      }

      toast.success("A new verification code has been dispatched!");
      setTimer(300); // Reset validity timer
      setResendCooldown(60); // Reset 60s resend cooldown
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOAuthLogin = async (provider: 'github' | 'google') => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) {
        toast.error(`OAuth login error: ${error.message}. Please check if ${provider} authentication is enabled in Supabase Console.`);
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to initiate OAuth login.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0A0F1C] text-slate-100 p-4 relative overflow-hidden font-sans selection:bg-blue-500/30">
      {/* Background gradients */}
      <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md p-8 rounded-3xl bg-white/5 border border-white/10 backdrop-blur-xl shadow-2xl relative z-10"
      >
        <div className="text-center mb-8">
          <div className="mx-auto w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-blue-500/20">
            <UserPlus className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Create an Account</h2>
          <p className="text-slate-400 mt-2 text-sm font-light">Join PrepForce AI to crush your interviews</p>
        </div>

        {success ? (
          <div className="text-center p-6 bg-green-500/10 rounded-xl border border-green-500/20">
             <h3 className="text-green-400 font-bold mb-2">Account Created!</h3>
             <p className="text-green-300/80 text-sm font-light">Redirecting you to the dashboard...</p>
          </div>
        ) : step === 'otp' ? (
          <motion.form
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            onSubmit={handleVerifyOtp}
            className="space-y-6"
          >
            <div className="text-center p-4 bg-blue-500/5 rounded-2xl border border-blue-500/10 mb-4">
              <span className="text-xs text-slate-400 font-light">Verification code sent to:</span>
              <div className="font-bold text-white text-sm mt-1">{email}</div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2 text-center">Enter 6-Digit Code</label>
              <div className="relative group">
                <KeyRound className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full pl-11 pr-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-slate-600 shadow-inner outline-none font-mono text-center text-2xl tracking-[0.4em] font-bold"
                  placeholder="000000"
                />
              </div>
              
              <div className="flex justify-between items-center text-[11px] text-slate-400 mt-3 px-1">
                <span>Expires in: <span className="font-semibold text-blue-400 font-mono">{formatTime(timer)}</span></span>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-blue-400 hover:text-blue-300 font-medium transition-colors disabled:opacity-30 flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className="w-3 h-3" /> Resend Code {resendCooldown > 0 ? `(${resendCooldown}s)` : ""}
                </button>
              </div>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={verifying || otp.length !== 6}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <ShieldCheck className="w-4 h-4" />
              {verifying ? "Verifying..." : "Verify & Complete Signup"}
            </motion.button>

            <button
              type="button"
              onClick={() => setStep('form')}
              className="w-full text-center text-xs text-slate-500 hover:text-slate-300 transition-colors cursor-pointer"
            >
              ← Edit Account Details
            </button>
          </motion.form>
        ) : (
          <motion.form 
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.1 } }
            }}
            onSubmit={handleSignup} 
            className="space-y-4"
          >
            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Email</label>
              <div className="relative group">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-slate-500 shadow-inner outline-none font-light"
                  placeholder="you@example.com"
                />
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-slate-500 shadow-inner outline-none font-light"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <label className="block text-sm font-medium text-slate-300 mb-1.5">Confirm Password</label>
              <div className="relative group">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-400 transition-colors" />
                <input
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-slate-500 shadow-inner outline-none font-light"
                  placeholder="••••••••"
                />
              </div>
            </motion.div>

            <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit"
                disabled={loading}
                className="w-full mt-2 bg-blue-600 hover:bg-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-50"
              >
                {loading ? "Sending Code..." : "Request Verification"}
              </motion.button>
            </motion.div>
          </motion.form>
        )}

        <div className="mt-6 flex items-center justify-between opacity-50">
          <span className="border-b border-white/10 flex-grow" />
          <span className="text-xs text-slate-400 font-medium px-4">OR CONTINUE WITH</span>
          <span className="border-b border-white/10 flex-grow" />
        </div>

        <div className="mt-6 space-y-3">
          
          <button 
            type="button"
            onClick={() => handleOAuthLogin('google')}
            className="w-full bg-white/5 border border-white/10 hover:bg-white/10 text-white flex items-center justify-center gap-2 font-medium py-3 rounded-xl transition-all"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"/>
              <path d="M12 16v-4"/>
              <path d="M12 8h.01"/>
            </svg>
            Continue with Google
          </button>
        </div>

        <p className="text-center text-sm text-slate-400 mt-8 font-light">
          Already have an account? <Link href="/login" className="text-blue-400 hover:text-blue-300 font-medium transition-colors">Sign in</Link>
        </p>
      </motion.div>
    </div>
  );
}
