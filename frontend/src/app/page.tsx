"use client";

import { motion } from "framer-motion";
import { Mic, FileText, BarChart3, ChevronRight, Brain } from "lucide-react";
import PrepForceLogo from "@/components/PrepForceLogo";
import Link from "next/link";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

export default function Home() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getSession() {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      setLoading(false);
    }
    getSession();
  }, []);

  return (
    <div className="min-h-screen bg-black text-slate-100 overflow-hidden selection:bg-white/20 font-sans">
      {/* Background Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-white/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-white/[0.03] rounded-full blur-[150px] pointer-events-none" />

      {/* Navbar */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-black/70 backdrop-blur-xl border-b border-white/5 h-20 flex items-center px-6 md:px-12 justify-between">
        <Link href="/" className="flex items-center group">
          <PrepForceLogo className="w-[180px] h-[36px] transition-transform group-hover:scale-[1.02]" />
        </Link>
        <div className="flex items-center gap-8 text-sm font-medium">
          <Link href="#features" className="text-slate-400 hover:text-white transition-colors hidden md:block">Features</Link>
          <Link href="#pricing" className="text-slate-400 hover:text-white transition-colors hidden md:block">Pricing</Link>
          
          {!loading && (
            <>
              {session ? (
                <div className="flex items-center gap-4">
                  <Link href="/dashboard" className="text-white hover:text-slate-300 transition-colors">Dashboard</Link>
                  <button 
                    onClick={async () => {
                      const supabase = createClient();
                      await supabase.auth.signOut();
                      setSession(null);
                    }} 
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-4">
                  <Link href="/login" className="text-white hover:text-slate-300 transition-colors">Sign In</Link>
                  <Link href="/signup" className="text-white hover:text-slate-300 transition-colors">Sign Up</Link>
                </div>
              )}
            </>
          )}

          <Link href="/dashboard" className="bg-white text-black px-6 py-2.5 rounded-full hover:bg-slate-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.08)] font-semibold">
            Get Started
          </Link>
        </div>
      </nav>

      <main className="relative pt-32 pb-16 md:pt-48 md:pb-32 px-6 md:px-12 max-w-7xl mx-auto z-10">
        {/* Background Image for Hero Section */}
        <div className="absolute top-0 left-0 w-full h-full sm:h-[800px] -z-10 overflow-hidden pointer-events-none">
          <div className="absolute inset-0 bg-black/60 z-10"></div>
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black z-10"></div>
          <img 
            src="/hero-bg.png" 
            alt="Hero Background" 
            className="w-full h-full object-cover opacity-40 grayscale" 
          />
        </div>

        {/* Hero Section */}
        <div className="flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/20 bg-white/5 text-white/70 text-sm mb-8 backdrop-blur-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white/60 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
            </span>
            PrepForce AI v2.0 is now live
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-5xl md:text-7xl font-extrabold tracking-tight max-w-4xl text-white leading-[1.1]"
          >
            Master your technical interview with <span className="text-transparent bg-clip-text bg-gradient-to-r from-white to-neutral-500">PrepForce AI</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="mt-6 text-lg md:text-xl text-slate-400 max-w-2xl font-light"
          >
            Upload your resume and practice with hyper-realistic, voice-based AI interviews. Get real-time behavioral tracking and expert coding feedback.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="mt-10 flex flex-col sm:flex-row gap-4 w-full sm:w-auto"
          >
            <Link href="/dashboard" className="group flex items-center justify-center gap-2 bg-white hover:bg-slate-200 text-black px-8 py-4 rounded-full text-base font-semibold transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)]">
              Start Mock Interview
              <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>

        {/* Feature Cards Showcase */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mt-32 grid md:grid-cols-3 gap-6 relative"
        >
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 group hover:border-white/30 hover:bg-white/10 transition-all relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full group-hover:bg-white/10 transition-all" />
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20 group-hover:scale-110 transition-transform relative z-10">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Smart Resume Parsing</h3>
            <p className="text-slate-400 leading-relaxed relative z-10 font-light">
              We extract your skills, projects, and experience to generate context-aware questions tailored to your exact profile and target job description.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 group hover:border-white/30 hover:bg-white/10 transition-all mt-0 md:mt-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full group-hover:bg-white/10 transition-all" />
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20 group-hover:scale-110 transition-transform relative z-10">
              <Mic className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Real-time Voice AI</h3>
            <p className="text-slate-400 leading-relaxed relative z-10 font-light">
              Talk directly with our AI just like a real interview. Ultra-low latency voice interaction makes it feel perfectly natural and conversational.
            </p>
          </div>

          <div className="bg-white/5 backdrop-blur-xl rounded-3xl border border-white/10 p-8 group hover:border-white/30 hover:bg-white/10 transition-all mt-0 md:mt-24 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 blur-[50px] rounded-full group-hover:bg-white/10 transition-all" />
            <div className="w-14 h-14 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20 group-hover:scale-110 transition-transform relative z-10">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-white mb-3 relative z-10">Live Coding & Analytics</h3>
            <p className="text-slate-400 leading-relaxed relative z-10 font-light">
              Code in a real Monaco editor while the AI evaluates your logic. Get an instant scorecard with behavioral analysis and Premium PDF exports.
            </p>
          </div>
        </motion.div>

        {/* Pricing Section */}
        <motion.div
           initial={{ opacity: 0, y: 40 }}
           whileInView={{ opacity: 1, y: 0 }}
           viewport={{ once: true }}
           transition={{ duration: 0.7 }}
           id="pricing"
           className="mt-40 relative z-10"
        >
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight text-white mb-4">Simple, Profitable Pricing</h2>
            <p className="text-slate-400 max-w-2xl mx-auto text-lg font-light">Guaranteed ROI with plans built to scale with your career.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Free Tier */}
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 flex flex-col hover:border-white/20 transition-colors">
              <h3 className="text-2xl font-bold text-white mb-2">Basic</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">₹0</span>
                <span className="text-slate-400 mb-1">/forever</span>
              </div>
              <ul className="space-y-4 mb-8 text-slate-300 flex-grow font-light">
                <li className="flex items-center gap-3"><span className="text-white">✓</span> 2 Interviews per day</li>
                <li className="flex items-center gap-3"><span className="text-white">✓</span> Standard feedback suite</li>
                <li className="flex items-center gap-3"><span className="text-white">✓</span> 1 Free Premium Report</li>
                <li className="flex items-center gap-3"><span className="text-white">✓</span> Access to basic roles</li>
              </ul>
              <Link href="/login" className="block w-full py-3.5 rounded-full border border-white/20 text-center text-white hover:bg-white/10 transition-colors font-medium mt-auto">Get Started Free</Link>
            </div>

            {/* Pro Monthly */}
            <div className="bg-white/5 backdrop-blur-xl p-8 rounded-3xl border border-white/10 relative overflow-hidden flex flex-col hover:border-white/20 transition-colors">
              <h3 className="text-2xl font-bold text-white mb-2">Pro Monthly</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">₹150</span>
                <span className="text-slate-400 mb-1">/month</span>
              </div>
              <ul className="space-y-4 mb-8 text-slate-300 relative z-10 flex-grow font-light">
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> 70 Interviews included/month</li>
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> ₹20 per extra interview</li>
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> Unlimited Premium Reports</li>
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> Priority Server Processing</li>
              </ul>
              <Link href="/login" className="block w-full py-3.5 rounded-full bg-white/10 border border-white/30 text-center text-white hover:bg-white/20 transition-colors font-medium mt-auto relative z-10">Upgrade to Pro Monthly</Link>
            </div>

            {/* Pro Yearly Tier */}
            <div className="bg-gradient-to-b from-white/10 to-black backdrop-blur-xl p-8 rounded-3xl border border-white relative overflow-hidden shadow-2xl shadow-white/5 flex flex-col">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-white to-neutral-500" />
              <div className="absolute top-0 right-0 bg-white text-black text-xs font-bold px-4 py-1.5 rounded-bl-xl shadow-lg">BEST VALUE</div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-white/5 rounded-full blur-[80px] pointer-events-none" />
              
              <h3 className="text-2xl font-bold text-white mb-2">Pro Yearly</h3>
              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-white">₹999</span>
                <span className="text-slate-300 mb-1">/year</span>
              </div>
              <ul className="space-y-4 mb-8 text-slate-200 relative z-10 flex-grow font-light">
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> 900 Interviews included/year</li>
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> ₹20 per extra interview</li>
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> Unlimited Premium Reports</li>
                <li className="flex items-center gap-3"><span className="text-white font-bold">✓</span> Highest Priority Processing</li>
              </ul>
              <Link href="/login" className="block w-full py-3.5 rounded-full bg-white text-center text-black hover:bg-slate-200 shadow-[0_0_20px_rgba(255,255,255,0.15)] transition-colors font-medium mt-auto relative z-10">Upgrade to Pro Yearly</Link>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
