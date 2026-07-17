"use client";

import { motion } from "framer-motion";
import { Award, Target, MessageSquare, TrendingUp, AlertTriangle, Lock, Home, ArrowLeft, Mic, Activity, Volume2 } from "lucide-react";
import { useState, useEffect, Suspense } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import PrepForceLogo from "@/components/PrepForceLogo";
import toast from "react-hot-toast";
import RadarChart from "@/components/report/RadarChart";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function ReportRoomContent() {
  const [report, setReport] = useState<any>(null);
  const [isPremiumUnlocked, setIsPremiumUnlocked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [eligibility, setEligibility] = useState({ isPro: false, isFreeAvailable: false, loading: true });
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('sessionId');

  useEffect(() => {
    async function fetchReport() {
      if (!sessionId) return;
      try {
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        setSession(session);
        
        const res = await fetch(`${API_BASE}/api/report/${sessionId}`, {
          headers: {
            Authorization: `Bearer ${session?.access_token || ""}`,
          }
        });
        
        if (res.ok) {
          const data = await res.json();
          setReport(data.report);
          if (data.report.isPremiumUnlocked) {
            setIsPremiumUnlocked(true);
          }
        } else {
          const data = await res.json();
          setError(data.error || "Failed to load report.");
        }

        if (session?.user) {
          const { data: userProfile } = await supabase.from('user_profiles').select('plan, role').eq('id', session.user.id).single();
          const { data: interviews } = await supabase.from('interviews').select('scorecard').eq('user_id', session.user.id);
          const unlockedCount = interviews?.filter(i => i.scorecard?.isPremiumUnlocked).length || 0;
          
          if (userProfile?.role === 'admin') {
            setIsAdmin(true);
          }
          
          setEligibility({
             isPro: userProfile?.plan !== 'free',
             isFreeAvailable: userProfile?.plan === 'free' && unlockedCount === 0,
             loading: false
          });
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || "An unexpected error occurred.");
      }
    }
    fetchReport();
  }, [sessionId]);

  const handleUnlockPremium = async () => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (eligibility.isPro || eligibility.isFreeAvailable) {
        const res = await fetch(`${API_BASE}/api/payment/unlock-free-report`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token || ""}`,
          },
          body: JSON.stringify({ userId: session?.user?.id, sessionId })
        });
        const data = await res.json();
        if (data.success) {
          setIsPremiumUnlocked(true);
          toast.success(eligibility.isPro ? "Premium Report Unlocked (Pro Perk)!" : "Premium Report Unlocked (1 Free Used)!");
          setEligibility(prev => ({ ...prev, isFreeAvailable: false }));
        } else {
          toast.error(data.error || "Failed to unlock");
        }
        return;
      }

      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ planId: "premium_report", userId: session?.user?.id, sessionId }),
      });
      
      const data = await res.json();
      if (!res.ok || !data.order) {
        throw new Error(data.error || "Failed to create Razorpay order");
      }
      const order = data.order;

      const options = {
        key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "rzp_test_placeholder",
        amount: order.amount,
        currency: order.currency,
        name: "PrepForce AI",
        description: "Unlock Premium Report",
        order_id: order.id,
        handler: async function (response: any) {
          const verifyRes = await fetch(`${API_BASE}/api/payment/verify`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${session?.access_token || ""}`,
            },
            body: JSON.stringify({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature
            })
          });
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            setIsPremiumUnlocked(true); // Unlock immediately in UI
            toast.success("Premium Report Unlocked!");
          } else {
            toast.error("Payment verification failed.");
          }
        },
        prefill: {
          email: session?.user?.email || "",
          contact: "",
        },
        theme: {
          color: "#2563eb"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("Failed to initiate checkout");
    }
  };



  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 selection:bg-blue-500/30">
        <div className="bg-white p-8 rounded-3xl border border-red-200 shadow-sm text-center max-w-md w-full">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Error Loading Report</h2>
          <p className="text-slate-600 mb-6">{error}</p>
          <Link href="/dashboard" className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl hover:bg-slate-800 transition-colors font-medium">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 blur-xl mb-8"
        />
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Analyzing your interview...</h2>
        <p className="text-slate-500 mb-8 max-w-sm text-center">Our AI is crunching the data, assessing your technical depth, and preparing a personalized scorecard.</p>
        
        <div className="w-full max-w-md space-y-4">
          <div className="h-24 bg-white rounded-2xl animate-pulse shadow-sm border border-slate-100" />
          <div className="grid grid-cols-3 gap-4">
            <div className="h-32 bg-white rounded-2xl animate-pulse shadow-sm border border-slate-100" />
            <div className="h-32 bg-white rounded-2xl animate-pulse shadow-sm border border-slate-100" />
            <div className="h-32 bg-white rounded-2xl animate-pulse shadow-sm border border-slate-100" />
          </div>
          <div className="h-48 bg-white rounded-2xl animate-pulse shadow-sm border border-slate-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 selection:bg-blue-500/30 font-sans">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-[#0A0F1C]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group hover:opacity-80 transition-opacity">
            <PrepForceLogo className="w-[140px] h-[28px] mr-1" />
            <span className="text-slate-600 mx-2 font-light">|</span>
            <span className="font-semibold text-lg text-slate-400">Interview Report</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer text-slate-400 hover:text-white" title="Go to Home">
              <Home className="w-4 h-4" />
            </Link>
            <Link href="/settings" title="Account Settings" className="w-8 h-8 rounded-full bg-blue-600 border border-blue-500 flex items-center justify-center overflow-hidden hover:ring-2 hover:ring-blue-400 transition-all cursor-pointer ml-2 shadow-[0_0_10px_rgba(37,99,235,0.4)]">
              <span className="text-xs text-white font-bold">
                {session?.user?.user_metadata?.full_name ? session.user.user_metadata.full_name[0].toUpperCase() : (session?.user?.email ? session.user.email[0].toUpperCase() : "?")}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <div className="w-full max-w-6xl mx-auto">
        <main id="report-content" className="p-6 md:p-12 pb-24 space-y-8 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        
        {/* Header Record */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-12">
          <div>
            <div className="flex items-center gap-4 mb-2 relative z-10">
              <h1 className="text-3xl font-bold tracking-tight text-white">Interview Performance</h1>
            </div>
            <p className="text-slate-400 relative z-10 font-light">Comprehensive AI Analysis & Feedback</p>
          </div>
          <div className="text-right relative z-10">
            <div className="text-sm font-semibold tracking-wider text-slate-400 uppercase">Overall Score</div>
            <div className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">{report.overallScore || 85}<span className="text-2xl text-slate-500">/100</span></div>
          </div>
        </div>

        {/* Dynamic Analytics & Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          {/* Left Column: Primary Competency Metric Cards */}
          <div className="lg:col-span-2 flex flex-col justify-between gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-xl flex-1 flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shadow-inner shrink-0"><Target className="w-7 h-7" /></div>
               <div>
                 <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Technical Depth</h3>
                 <p className="text-3xl font-extrabold mt-1 text-white">{report.technicalDepth || 90}<span className="text-lg text-slate-500 font-normal">/100</span></p>
                 <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">Demonstrated familiarity with programming structures, engineering paradigms, and design patterns.</p>
               </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-xl flex-1 flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center text-purple-400 shadow-inner shrink-0"><MessageSquare className="w-7 h-7" /></div>
               <div>
                 <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Communication</h3>
                 <p className="text-3xl font-extrabold mt-1 text-white">{report.communication || 82}<span className="text-lg text-slate-500 font-normal">/100</span></p>
                 <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">Clearness in articulating statements, explanation layout pacing, and formatting structural answers.</p>
               </div>
            </motion.div>
            
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-xl flex-1 flex items-center gap-6">
               <div className="w-14 h-14 rounded-2xl bg-green-500/20 flex items-center justify-center text-green-400 shadow-inner shrink-0"><TrendingUp className="w-7 h-7" /></div>
               <div>
                 <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Confidence</h3>
                 <p className="text-3xl font-extrabold mt-1 text-white">{report.confidence || 88}<span className="text-lg text-slate-500 font-normal">/100</span></p>
                 <p className="text-xs text-slate-400 mt-1 font-light leading-relaxed">Stature, poise under pressure, voice modulation consistency, and pacing control during prompt answers.</p>
               </div>
            </motion.div>
          </div>

          {/* Right Column: Premium Custom Interactive Radar Pentagon Chart */}
          <div className="lg:col-span-1">
            <RadarChart
              technicalDepth={report.technicalDepth}
              communication={report.communication}
              confidence={report.confidence}
              overallScore={report.overallScore}
            />
          </div>
        </div>

        {/* Premium Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className={`relative rounded-3xl overflow-hidden mt-12 bg-white/5 border shadow-lg backdrop-blur-xl z-10 ${(isPremiumUnlocked || isAdmin) ? 'border-indigo-500/30' : 'border-white/10'}`}>
           {(!isPremiumUnlocked && !isAdmin) && (
             <div className="absolute inset-0 z-20 backdrop-blur-xl bg-[#0A0F1C]/80 flex flex-col items-center justify-center p-8 text-center border border-white/5 rounded-3xl">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(37,99,235,0.3)]">
                  <Lock className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-2xl font-bold mb-2 text-white">Premium Deep-Dive</h3>
                <p className="text-slate-400 max-w-md mb-8 font-light">Unlock actionable improvements, red flags detected by AI, and exact phrases to avoid in your next interview.</p>
                <button onClick={handleUnlockPremium} disabled={eligibility.loading} className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-8 py-3.5 rounded-full font-medium shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all disabled:opacity-50">
                  {eligibility.loading ? "Loading..." : 
                   eligibility.isPro ? "Unlock Premium Report (Included in Pro)" :
                   eligibility.isFreeAvailable ? "Unlock Premium Report (1 Free Remaining)" :
                   "Unlock Premium Report for ₹30"}
                </button>
             </div>
           )}

           <div className={`p-8 ${(!isPremiumUnlocked && !isAdmin) && 'blur-md opacity-50 pointer-events-none'}`}>
              <div className="flex items-center gap-3 mb-8">
                <div className="w-10 h-10 bg-indigo-500/20 rounded-xl flex items-center justify-center">
                  <Award className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-2xl font-bold text-white">Premium Feedback</h2>
              </div>
              
              <div className="space-y-8">
                <div>
                  <h3 className="text-lg font-bold text-green-400 mb-4 flex items-center gap-2">Strengths</h3>
                  <motion.ul 
                    initial="hidden" 
                    animate="visible" 
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }} 
                    className="space-y-3"
                  >
                    {report.strengths?.map((str: string, i: number) => (
                      <motion.li 
                        variants={{ hidden: { opacity: 0, x: -20 }, visible: { opacity: 1, x: 0 } }} 
                        key={i} 
                        className="flex gap-3 text-slate-300 font-light"
                      >
                        <span className="text-green-400 mt-1">•</span> <span className="leading-relaxed">{str}</span>
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>
                
                <div className="h-px bg-white/10 w-full" />

                <div>
                  <h3 className="text-lg font-bold text-amber-400 mb-4 flex items-center gap-2"><AlertTriangle className="w-5 h-5" /> Areas for Improvement</h3>
                  <motion.ul 
                    initial="hidden" 
                    animate="visible" 
                    variants={{ visible: { transition: { staggerChildren: 0.1 } } }} 
                    className="space-y-4"
                  >
                    {report.improvements?.map((imp: string, i: number) => (
                      <motion.li 
                        variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} 
                        key={i} 
                        className="bg-[#0D1326] p-5 rounded-2xl border border-white/5"
                      >
                        <p className="font-medium text-white mb-2">Area {i + 1}</p>
                        <p className="text-sm text-slate-400 leading-relaxed font-light">{imp}</p>
                      </motion.li>
                    ))}
                  </motion.ul>
                </div>                {report.behavioralAnalysis && (() => {
                  const bData = report.behavioralData || {};
                  const total = bData.totalFrames || 0;
                  const smiles = bData.smileFrames || 0;
                  const distracted = bData.distractedFrames || 0;
                  const tabSwitches = bData.tabViolations || 0;

                  // Telemetry ratios
                  const focusRate = total > 0 ? Math.max(0, Math.min(100, Math.round(((total - distracted) / total) * 100))) : 100;
                  const smileRate = total > 0 ? Math.max(0, Math.min(100, Math.round((smiles / total) * 100))) : 0;

                  return (
                    <>
                      <div className="h-px bg-white/10 w-full" />
                      <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="space-y-6">
                        <h3 className="text-lg font-bold text-indigo-400 mb-4 flex items-center gap-2">Behavioral & Non-Verbal Analysis</h3>
                        <div className="bg-indigo-500/10 p-5 rounded-2xl border border-indigo-500/20">
                          <p className="text-sm text-indigo-200/80 leading-relaxed font-light">{report.behavioralAnalysis}</p>
                        </div>

                        {/* Visual Non-Verbal Analytics Badges Grid */}
                        {total > 0 || tabSwitches > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                            
                            {/* Card 1: Screen Focus & Tab Compliance */}
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Compliance Registry</span>
                                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                                    tabSwitches === 0 
                                      ? 'bg-green-500/15 text-green-400 border-green-500/20 shadow-[0_0_10px_rgba(34,197,94,0.15)]' 
                                      : 'bg-red-500/15 text-red-400 border-red-500/20 shadow-[0_0_10px_rgba(239,68,68,0.15)]'
                                  }`}>
                                    {tabSwitches === 0 ? '✓ Integrity Verified' : '🚨 Warning Flagged'}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className={`text-3xl font-black ${tabSwitches === 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {tabSwitches === 0 ? '100%' : `${tabSwitches} Switch${tabSwitches > 1 ? 'es' : ''}`}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-light">compliance index</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-light">
                                  {tabSwitches === 0 
                                    ? 'Exceptional compliance! You remained focused within the assessment terminal throughout the entire session.' 
                                    : `Integrity warning: Left the mock interview frame ${tabSwitches} time(s). Technical assessments mark screen changes as compliance violations.`
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Card 2: Gaze Focus Rate */}
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Gaze & Focus Index</span>
                                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                                    focusRate >= 75 ? 'bg-green-500/15 text-green-400 border-green-500/20' :
                                    focusRate >= 45 ? 'bg-yellow-500/15 text-yellow-400 border-yellow-500/20' :
                                    'bg-red-500/15 text-red-400 border-red-500/20'
                                  }`}>
                                    {focusRate >= 75 ? 'Optimal Gaze' :
                                     focusRate >= 45 ? 'Moderate Drift' :
                                     'High Distraction'}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-3xl font-black text-white">{focusRate}%</span>
                                  <span className="text-[10px] text-slate-500 font-light">camera alignment</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-light">
                                  {focusRate >= 75 ? 'Outstanding eye contact! Your gaze was anchored directly onto the screen vector, expressing composure and attention.' :
                                   focusRate >= 45 ? 'Captured occasional gaze drift. Try to maintain focus on the lens, particularly when answering technical questions.' :
                                   'Significant eye drift detected. Ensure your camera is centered, you are well-lit, and try to minimize lateral head movements.'
                                  }
                                </p>
                              </div>
                            </div>

                            {/* Card 3: Expression Poise & Warmth */}
                            <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4 flex flex-col justify-between hover:border-indigo-500/20 transition-all">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-widest">Warmth & Stature</span>
                                  <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full border ${
                                    smileRate >= 5 ? 'bg-purple-500/15 text-purple-400 border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.15)]' :
                                    'bg-slate-500/15 text-slate-300 border-slate-700'
                                  }`}>
                                    {smileRate >= 5 ? '😊 High Warmth' : '😐 Neutral Poise'}
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className={`text-3xl font-black ${smileRate >= 5 ? 'text-purple-400' : 'text-slate-300'}`}>
                                    {smileRate >= 5 ? 'Engaging' : 'Composed'}
                                  </span>
                                  <span className="text-[10px] text-slate-500 font-light">conversational tone</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed font-light">
                                  {smileRate >= 5 
                                    ? 'Very engaging expression! Frequent smiles were logged, conveying high warmth, approachability, and conversational energy.' 
                                    : 'A highly neutral, steady executive presence was maintained. Expressive bursts could boost warmth, but poise is excellent.'
                                  }
                                </p>
                              </div>
                            </div>

                          </div>
                        ) : (
                          <div className="bg-white/5 border border-white/5 p-4 rounded-xl text-center text-xs text-slate-500 font-light font-mono">
                            CAMERA_TRACKING_INACTIVE // Behavioral frame telemetry could not be gathered.
                          </div>
                        )}
                      </motion.div>
                    </>
                  );
                })()}

                {report.speechAnalytics && (
                  <>
                    <div className="h-px bg-white/10 w-full" />
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="space-y-6">
                      <h3 className="text-lg font-bold text-blue-400 mb-2 flex items-center gap-2">
                        <Mic className="w-5 h-5" /> Vocal & Speech Analytics
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* WPM Pacing Card */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-400">Speaking Pace</span>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              report.speechAnalytics.wpm < 90 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                              report.speechAnalytics.wpm <= 150 ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                              'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              {report.speechAnalytics.wpm < 90 ? '🐢 Slow' :
                               report.speechAnalytics.wpm <= 150 ? '⚡ Optimal' :
                               '🚀 Fast'}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-white">{report.speechAnalytics.wpm}</span>
                            <span className="text-sm text-slate-500 font-light">Words per minute (WPM)</span>
                          </div>
                          
                          <p className="text-xs text-slate-400 leading-relaxed font-light">
                            {report.speechAnalytics.wpm < 90 ? 'Your speaking speed is deliberate and calm, but could feel slightly lethargic. Try increasing your energy and word flow to sound more engaged.' :
                             report.speechAnalytics.wpm <= 150 ? 'Fantastic speaking rate! Your pace matches standard professional conversational speed (110-140 WPM), making your ideas exceptionally easy to digest.' :
                             'You are speaking very quickly. This can rush the delivery of key technical details. Try taking slow breaths and pausing intentionally after completing a point.'}
                          </p>
                        </div>

                        {/* Filler Words Card */}
                        <div className="bg-white/5 border border-white/5 p-6 rounded-2xl space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-semibold text-slate-400">Filler Word Usage</span>
                            <span className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                              report.speechAnalytics.totalFillers <= 5 ? 'bg-green-500/15 text-green-400 border border-green-500/20' :
                              report.speechAnalytics.totalFillers <= 15 ? 'bg-yellow-500/15 text-yellow-400 border border-yellow-500/20' :
                              'bg-red-500/15 text-red-400 border border-red-500/20'
                            }`}>
                              {report.speechAnalytics.totalFillers <= 5 ? 'Excellent Control' :
                               report.speechAnalytics.totalFillers <= 15 ? 'Moderate Fillers' :
                               'High Filler Frequency'}
                            </span>
                          </div>
                          
                          <div className="flex items-baseline gap-2">
                            <span className="text-4xl font-extrabold text-white">{report.speechAnalytics.totalFillers}</span>
                            <span className="text-sm text-slate-500 font-light">Total fillers detected</span>
                          </div>

                          <div className="space-y-2 mt-2">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">Filler Breakdown</div>
                            <div className="grid grid-cols-3 gap-2">
                              {Object.entries(report.speechAnalytics.fillers || {}).map(([word, count]: [string, any]) => (
                                <div key={word} className="bg-black/20 p-2 rounded-lg border border-white/5 flex flex-col items-center">
                                  <span className="text-xs text-slate-400 font-mono">"{word}"</span>
                                  <span className={`text-sm font-bold mt-0.5 ${count > 3 ? 'text-red-400' : count > 0 ? 'text-yellow-400' : 'text-slate-500'}`}>
                                    {count}x
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </>
                )}
              </div>
           </div>
        </motion.div>

        </main>
      </div>
    </div>
  );
}

export default function ReportPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#0A0F1C] text-slate-100 flex flex-col items-center justify-center p-6 font-sans">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.5, 1, 0.5] }} 
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 blur-xl mb-8"
        />
        <h2 className="text-xl font-bold text-white mb-2">Loading performance report...</h2>
        <p className="text-slate-400 text-sm max-w-sm text-center">Fetching interview analytics and AI scoring card...</p>
      </div>
    }>
      <ReportRoomContent />
    </Suspense>
  );
}
