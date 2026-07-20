"use client";

import { motion } from "framer-motion";
import { Upload, PlayCircle, Clock, FileText, CheckCircle2, AlertCircle, Brain, Home, ArrowLeft, Trash2, Code2, Trophy, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import PrepForceLogo from "@/components/PrepForceLogo";
import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { problems } from "@/lib/problems";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function UserDashboard() {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobTitle, setJobTitle] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro_plan_yearly");
  const [userProfile, setUserProfile] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [interviews, setInterviews] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [saveTemplate, setSaveTemplate] = useState(false);
  const [activeTab, setActiveTab] = useState<'interviews' | 'coding'>('interviews');
  const [codingAttempts, setCodingAttempts] = useState<any[]>([]);
  const [expandedAttemptId, setExpandedAttemptId] = useState<string | null>(null);
  const router = useRouter();

  const getFreeInterviewsLeft = () => {
    if (!interviews) return 2;
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);
    const createdToday = interviews.filter(i => new Date(i.created_at) >= startOfToday).length;
    return Math.max(0, 2 - createdToday);
  };

  useEffect(() => {
    const fetchProfile = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
      if (session?.user) {
        const { data } = await supabase.from('user_profiles').select('*').eq('id', session.user.id).single();
        if (data) setUserProfile(data);

        const { data: interviewData } = await supabase
          .from('interviews')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (interviewData) setInterviews(interviewData);
        
        // Fetch coding attempts
        const { data: codingData } = await supabase
          .from('coding_attempts')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (codingData) setCodingAttempts(codingData);

        // Attempt to fetch templates (may fail if user hasn't run the SQL script yet)
        const { data: templateData } = await supabase
          .from('job_templates')
          .select('*')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });
        if (templateData) setTemplates(templateData);
      }
    };
    fetchProfile();
  }, []);

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleStartInterview = async (type: 'standard' | 'coding' = 'standard') => {
    // Coding challenges don't need a resume or backend interview session anymore
    if (type === 'coding') {
      const randomSessionId = crypto.randomUUID();
      router.push(`/coding?sessionId=${randomSessionId}`);
      return;
    }

    if (!file) return toast.error("Please upload a resume first");
    
    setUploading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const formData = new FormData();
      formData.append("resume", file);
      if (jobTitle) formData.append("jobTitle", jobTitle);
      if (jobDescription) formData.append("jobDescription", jobDescription);
      
      // Save template if requested
      if (saveTemplate && jobTitle && jobDescription) {
        await supabase.from('job_templates').insert([{
          user_id: session?.user?.id,
          title: jobTitle,
          description: jobDescription
        }]);
      }

      const res = await fetch(`${API_BASE}/api/interview/upload-resume`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (res.ok && data.sessionId) {
         router.push(`/interview?sessionId=${data.sessionId}`);
      } else {
        if (res.status === 404) {
          toast.error(`Backend API Not Found (404). Ensure NEXT_PUBLIC_API_URL points to your Express backend server, not Vercel frontend.`);
        } else {
          const detailMsg = data.details?.message || data.details?.details || data.error;
          toast.error(detailMsg ? `Upload failed: ${detailMsg}` : `Upload failed (${res.status}: ${res.statusText || 'Server Error'})`);
        }
      }
    } catch (error: any) {
      console.error("Resume upload error:", error);
      toast.error(error?.message?.includes("fetch") 
        ? `Cannot connect to API server (${API_BASE}). Please check network connection.` 
        : (error?.message || "An unexpected error occurred while uploading."));
    } finally {
      setUploading(false);
    }
  };

  const handleCheckout = async (planId: string) => {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_BASE}/api/payment/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
        body: JSON.stringify({ planId, userId: session?.user?.id }),
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
        description: "Purchase / Upgrade",
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
            toast.success("Payment successful!");
          } else {
            toast.error("Payment verification failed.");
          }
        },
        prefill: {
          email: session?.user?.email || "",
          contact: "",
        },
        theme: {
          color: "#2563eb" // Corporate Blue
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error(error);
      toast.error("Failed to initiate checkout");
    }
  };

  const handleDeleteInterview = async (interviewId: string) => {
    if (!confirm("Are you sure you want to delete this interview?")) return;
    
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      const res = await fetch(`${API_BASE}/api/interview/${interviewId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session?.access_token || ""}`,
        },
      });

      if (res.ok) {
        setInterviews(prev => prev.filter(i => i.id !== interviewId));
        toast.success("Interview deleted");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to delete interview");
      }
    } catch (error) {
      console.error(error);
      toast.error("An unexpected error occurred while deleting.");
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 selection:bg-blue-500/30 font-sans">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-[#0A0F1C]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group hover:opacity-80 transition-opacity">
            <PrepForceLogo className="w-[200px] h-[40px] mr-1" />
            <span className="text-slate-600 mx-2 font-light">|</span>
            <span className="font-semibold text-lg text-slate-400">Dashboard</span>
          </Link>
          <div className="flex items-center gap-4">
            {session ? (
              <>
                {userProfile?.role === 'admin' && (
                  <Link 
                    href="/admin" 
                    className="text-xs px-3.5 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full font-bold transition-all shadow-sm shadow-amber-500/5 mr-2 cursor-pointer"
                  >
                    👑 Admin Console
                  </Link>
                )}
                <span className="text-sm px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 shadow-sm backdrop-blur-md">
                  {userProfile ? `${userProfile.plan === 'free' ? 'Free' : 'Pro'} Plan (${userProfile.plan === 'free' ? getFreeInterviewsLeft() : userProfile.interviews_left} left)` : "Loading..."}
                </span>
                <button onClick={handleLogout} className="text-sm font-medium text-slate-400 hover:text-white transition-colors cursor-pointer">
                  Log Out
                </button>
              </>
            ) : (
              <>
                <span className="text-sm px-4 py-1.5 bg-white/5 border border-white/10 rounded-full text-slate-300 shadow-sm backdrop-blur-md">
                  Guest Mode
                </span>
                <Link href="/login" className="text-sm font-medium text-blue-400 hover:text-blue-300 transition-colors">
                  Sign In
                </Link>
              </>
            )}
            
            <Link href="/" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 hover:border-white/20 transition-all cursor-pointer text-slate-400 hover:text-white shadow-sm" title="Go to Home">
              <Home className="w-4 h-4" />
            </Link>
            <Link href="/settings" title="Account Settings" className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 border border-blue-400/30 flex items-center justify-center overflow-hidden hover:shadow-[0_0_15px_rgba(37,99,235,0.5)] transition-all cursor-pointer ml-2 shadow-[0_0_10px_rgba(37,99,235,0.3)]">
              <span className="text-sm text-white font-bold">
                {session?.user?.user_metadata?.full_name ? session.user.user_metadata.full_name[0].toUpperCase() : (session?.user?.email ? session.user.email[0].toUpperCase() : "?")}
              </span>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-6 pt-16 pb-24 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="grid md:grid-cols-3 gap-8 relative z-10">
          
          {/* Main Actions Column */}
          <div className="md:col-span-2 space-y-8">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
               <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-[80px] pointer-events-none rounded-full" />
               <h2 className="text-2xl font-bold mb-2 text-white relative z-10">Ready for your mock interview?</h2>
               <p className="text-slate-400 mb-8 max-w-md relative z-10 font-light">Upload your resume and we will tailor the AI's questions to your specific experience and the role you are targeting.</p>
               
               <form 
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  className={`border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center transition-all relative z-10 ${dragActive ? "border-blue-400 bg-blue-500/10" : "border-white/20 bg-[#0D1326]/50 hover:border-white/30"}`}
               >
                 <Upload className={`w-10 h-10 mb-4 transition-colors ${dragActive ? "text-blue-400" : "text-slate-500"}`} />
                 <h3 className="text-lg font-medium mb-1 text-white">
                   {file ? file.name : "Drag & drop your resume"}
                 </h3>
                 <p className="text-slate-400 text-sm mb-6 font-light">PDF or DOCX (Max 5MB)</p>
                 <label className="cursor-pointer bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-full font-medium hover:from-blue-500 hover:to-indigo-500 transition-all shadow-[0_0_20px_rgba(37,99,235,0.4)]">
                   Browse Files
                   <input type="file" onChange={handleFileChange} className="hidden" accept=".pdf,.doc,.docx" />
                 </label>
                 </form>

                 <div className="mt-6 space-y-4 text-left relative z-10">
                   <div className="flex items-center justify-between">
                     <label className="block text-sm font-medium text-slate-300">Target Role (Optional)</label>
                     {templates.length > 0 && (
                       <select 
                         onChange={(e) => {
                           const t = templates.find(temp => temp.id === e.target.value);
                           if (t) {
                             setJobTitle(t.title);
                             setJobDescription(t.description);
                           }
                         }}
                         className="text-xs bg-[#0D1326] border border-white/10 rounded-lg px-3 py-1.5 outline-none text-slate-300"
                       >
                         <option value="" className="bg-[#0D1326] text-slate-200">Load Template...</option>
                         {templates.map(t => (
                           <option key={t.id} value={t.id} className="bg-[#0D1326] text-slate-200">{t.title}</option>
                         ))}
                       </select>
                     )}
                   </div>
                   <div>
                     <input 
                       type="text" 
                       value={jobTitle}
                       onChange={(e) => setJobTitle(e.target.value)}
                       placeholder="e.g. Senior Frontend Engineer" 
                       className="w-full px-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner text-white placeholder:text-slate-500 outline-none font-light"
                     />
                   </div>
                   <div>
                     <label className="block text-sm font-medium text-slate-300 mb-1.5">Job Description (Optional)</label>
                     <textarea 
                       value={jobDescription}
                       onChange={(e) => setJobDescription(e.target.value)}
                       placeholder="Paste the job description here to tailor the interview..." 
                       rows={3}
                       className="w-full px-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all shadow-inner text-white placeholder:text-slate-500 resize-none outline-none font-light"
                     />
                   </div>
                   
                   <div className="flex items-center gap-3 mt-2">
                     <input 
                       type="checkbox" 
                       id="saveTemplate" 
                       checked={saveTemplate}
                       onChange={(e) => setSaveTemplate(e.target.checked)}
                       className="w-4 h-4 text-blue-500 bg-[#0D1326] border-white/20 rounded focus:ring-blue-500 focus:ring-offset-[#0A0F1C]"
                     />
                     <label htmlFor="saveTemplate" className="text-sm text-slate-400 cursor-pointer select-none">
                       Save this role as a template for future interviews
                     </label>
                   </div>
                 </div>

                 <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row justify-end gap-4 relative z-10">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleStartInterview('standard')} disabled={uploading || !file} className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-medium shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <PlayCircle className="w-5 h-5" />
                    {uploading ? "Preparing AI..." : "Standard Interview"}
                  </motion.button>
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleStartInterview('coding')} className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-3 rounded-full font-medium shadow-[0_0_20px_rgba(79,70,229,0.4)] transition-all flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5" />
                    Coding Challenge
                  </motion.button>
                </div>
             </motion.div>

             <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mt-8">
               <div className="flex items-center gap-6 border-b border-white/10 pb-3 mb-6 relative z-10">
                 <button
                   onClick={() => setActiveTab('interviews')}
                   className={`pb-2 text-lg font-bold transition-all relative cursor-pointer ${
                     activeTab === 'interviews' 
                       ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-blue-500' 
                       : 'text-slate-400 hover:text-slate-200'
                   }`}
                 >
                   Mock Interviews
                 </button>
                 <button
                   onClick={() => setActiveTab('coding')}
                   className={`pb-2 text-lg font-bold transition-all relative cursor-pointer ${
                     activeTab === 'coding' 
                       ? 'text-white after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-indigo-500' 
                       : 'text-slate-400 hover:text-slate-200'
                   }`}
                 >
                   Coding Challenges
                 </button>
               </div>

               {activeTab === 'interviews' ? (
                 <div className="space-y-4">
                   <h3 className="text-xl font-bold mb-4 flex items-center gap-2 text-white">
                     <Clock className="w-5 h-5 text-slate-400" />
                     Recent Interviews
                   </h3>
                   <div className="space-y-4">
                     {interviews.length === 0 ? (
                       <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="p-8 rounded-3xl bg-white/5 border border-white/10 text-center flex flex-col items-center justify-center backdrop-blur-md">
                         <div className="w-16 h-16 bg-white/10 rounded-2xl shadow-inner flex items-center justify-center mb-6 text-slate-400">
                           <FileText className="w-8 h-8" />
                         </div>
                         <h4 className="text-lg font-bold text-white mb-2">No Interviews Yet</h4>
                         <p className="text-slate-400 text-sm max-w-xs mx-auto font-light">Upload your resume and hit "Start Interview" to begin your first mock session.</p>
                       </motion.div>
                     ) : (
                       interviews.map((interview) => (
                         <div key={interview.id} className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-lg backdrop-blur-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-500/50 transition-colors">
                           <div>
                             <h4 className="font-bold text-lg text-white">{interview.role || 'General Candidate'}</h4>
                             <p className="text-sm text-slate-400 flex items-center gap-2 mt-1">
                               {interview.status === 'completed' ? (
                                 <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="w-3 h-3" /> Completed</span>
                               ) : (
                                 <span className="flex items-center gap-1 text-blue-400"><PlayCircle className="w-3 h-3" /> In Progress</span>
                               )}
                               • {new Date(interview.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                             </p>
                           </div>
                           <div className="flex items-center gap-3">
                             {interview.status === 'completed' && (
                               <div className="text-right mr-2">
                                 <div className="text-xs text-slate-500 uppercase tracking-wider font-semibold">Score</div>
                                 <div className="text-2xl font-bold text-blue-400">{interview.scorecard?.overallScore || '-'}/100</div>
                               </div>
                             )}
                             <Link 
                               href={interview.status === 'completed' ? `/report?sessionId=${interview.id}` : `/interview?sessionId=${interview.id}`} 
                               className="p-3 rounded-xl bg-[#0D1326] border border-white/10 text-slate-300 hover:text-white hover:bg-blue-600 hover:border-blue-500 transition-all flex items-center gap-2 shadow-inner"
                             >
                               {interview.status === 'completed' ? <FileText className="w-5 h-5" /> : <PlayCircle className="w-5 h-5" />}
                               <span className="text-sm font-medium hidden sm:block">
                                 {interview.status === 'completed' ? 'Report' : 'Continue'}
                               </span>
                             </Link>
                             <motion.button
                               whileHover={{ scale: 1.1 }}
                               whileTap={{ scale: 0.9 }}
                               onClick={() => handleDeleteInterview(interview.id)}
                               className="p-3 rounded-xl bg-[#0D1326] border border-white/10 text-slate-500 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/30 transition-all flex items-center justify-center shadow-inner cursor-pointer"
                               title="Delete Interview"
                             >
                               <Trash2 className="w-5 h-5" />
                             </motion.button>
                           </div>
                         </div>
                       ))
                     )}
                   </div>
                 </div>
               ) : (
                 <div className="space-y-8">
                   {/* Quick Stats Grid */}
                   {(() => {
                     const solvedProblemIds = Array.from(new Set(codingAttempts.filter(a => a.passed).map(a => a.problem_id)));
                     const totalSolvedCount = solvedProblemIds.length;
                     const passRate = codingAttempts.length > 0 
                       ? Math.round((codingAttempts.filter(a => a.passed).length / codingAttempts.length) * 100) 
                       : 0;

                     return (
                       <div className="grid grid-cols-3 gap-4">
                         <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                           <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Total Runs</span>
                           <span className="text-2xl font-black text-white font-mono block">{codingAttempts.length}</span>
                         </div>
                         <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                           <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Solved Problems</span>
                           <span className="text-2xl font-black text-indigo-400 font-mono block">{totalSolvedCount} <span className="text-xs text-slate-500 font-normal">/ {problems.length}</span></span>
                         </div>
                         <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-center space-y-1">
                           <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold block">Run Pass Rate</span>
                           <span className="text-2xl font-black text-green-400 font-mono block">{passRate}%</span>
                         </div>
                       </div>
                     );
                   })()}

                   {/* Problems checklist */}
                   <div className="space-y-4">
                     <h4 className="text-lg font-bold text-white flex items-center gap-2">
                       <Trophy className="w-5 h-5 text-indigo-400" /> Challenge Directory
                     </h4>
                     
                     <div className="space-y-3">
                       {problems.map(prob => {
                         const attemptsForProb = codingAttempts.filter(a => a.problem_id === prob.id);
                         const isSolved = attemptsForProb.some(a => a.passed);
                         const isAttempted = attemptsForProb.length > 0;
                         
                         let statusText = "Not Started";
                         let statusColor = "bg-white/5 text-slate-400 border border-white/5";
                         if (isSolved) {
                           statusText = "Solved ✅";
                           statusColor = "bg-green-500/10 text-green-400 border border-green-500/20";
                         } else if (isAttempted) {
                           statusText = "Attempted ⚠️";
                           statusColor = "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20";
                         }

                         return (
                           <div key={prob.id} className="p-5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between gap-4 hover:border-indigo-500/20 transition-colors">
                             <div className="space-y-1">
                               <div className="flex items-center gap-2">
                                 <span className="font-bold text-white text-base">{prob.title}</span>
                                 <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                                   prob.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' :
                                   prob.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                   'bg-red-500/20 text-red-400'
                                 }`}>
                                   {prob.difficulty}
                                 </span>
                               </div>
                               <div className="text-xs text-slate-400 font-light truncate max-w-md">{prob.tags.join(" • ")}</div>
                             </div>
                             
                             <div className="flex items-center gap-4">
                               <span className={`px-3 py-1 text-xs font-semibold rounded-full ${statusColor}`}>
                                 {statusText}
                               </span>
                               <button
                                 onClick={() => router.push(`/coding?sessionId=${crypto.randomUUID()}`)}
                                 className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors shadow-md shadow-indigo-600/10 cursor-pointer"
                               >
                                 {isSolved ? "Practice Again" : "Solve Challenge"}
                               </button>
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   </div>

                   {/* Detailed attempts log */}
                   <div className="space-y-4 pt-4">
                     <h4 className="text-lg font-bold text-white flex items-center gap-2">
                       <Code2 className="w-5 h-5 text-slate-400" /> Execution History Log
                     </h4>
                     
                     <div className="space-y-3">
                       {codingAttempts.length === 0 ? (
                         <div className="p-6 rounded-2xl bg-white/5 border border-white/5 text-center text-slate-500 text-xs font-light">
                           No code submissions or compile attempts logged yet. Get started in the sandbox!
                         </div>
                       ) : (
                         codingAttempts.map(attempt => {
                           const probTitle = problems.find(p => p.id === attempt.problem_id)?.title || attempt.problem_id;
                           const isExpanded = expandedAttemptId === attempt.id;

                           return (
                             <div key={attempt.id} className="rounded-2xl bg-[#0D1326]/50 border border-white/5 overflow-hidden transition-all">
                               <div className="p-4 flex items-center justify-between gap-4">
                                 <div className="space-y-1">
                                   <div className="font-bold text-white text-sm">{probTitle}</div>
                                   <div className="text-[11px] text-slate-400 font-light flex items-center gap-2">
                                     <span className="capitalize">{attempt.language}</span>
                                     <span>•</span>
                                     <span>{new Date(attempt.created_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                   </div>
                                 </div>
                                 
                                 <div className="flex items-center gap-3">
                                   <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                                     attempt.passed ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                   }`}>
                                     {attempt.passed ? 'Passed ✓' : 'Failed ✗'}
                                   </span>
                                   
                                   <button
                                     onClick={() => setExpandedAttemptId(isExpanded ? null : attempt.id)}
                                     className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:text-white transition-all cursor-pointer"
                                     title={isExpanded ? "Collapse Output" : "View Logs"}
                                   >
                                     {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                   </button>
                                 </div>
                               </div>
                               
                               {isExpanded && (
                                 <div className="px-4 pb-4 border-t border-white/5 bg-black/30 p-4 font-mono text-[11px] text-slate-300 max-h-48 overflow-y-auto space-y-2">
                                   <div className="text-[10px] text-slate-500 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                     <Terminal className="w-3.5 h-3.5" /> Compiler stdout output
                                   </div>
                                   <pre className="whitespace-pre-wrap leading-relaxed">{attempt.execution_output || "No compiler logs returned."}</pre>
                                 </div>
                               )}
                             </div>
                           );
                         })
                       )}
                     </div>
                   </div>
                 </div>
               )}
              </motion.div>
            </div>

          {/* Sidebar */}
          <div className="space-y-6 relative z-10 sticky top-24 h-fit">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl">
               <div className="flex items-start justify-between mb-4">
                 <span className="bg-[#0D1326] text-xs px-3 py-1.5 rounded-full text-slate-300 font-medium border border-white/5 shadow-inner">
                   {userProfile ? (userProfile.plan === 'free' ? 'Free' : 'Pro') : "..."}
                 </span>
               </div>
               
               <div className="space-y-4">
                 <div>
                   <div className="flex justify-between text-sm mb-2">
                     <span className="text-slate-400">Interviews Left</span>
                     <span className="font-medium text-white">{userProfile ? (userProfile.plan === 'free' ? getFreeInterviewsLeft() : userProfile.interviews_left) : "-"}</span>
                   </div>
                   <div className="w-full h-2 bg-[#0D1326] rounded-full overflow-hidden shadow-inner">
                     {(() => {
                       let max = 2;
                       let current = userProfile ? (userProfile.plan === 'free' ? getFreeInterviewsLeft() : userProfile.interviews_left) : 0;
                       if (userProfile?.plan === 'pro_monthly') max = 70;
                       if (userProfile?.plan === 'pro_yearly') max = 900;
                       const percent = userProfile ? Math.min(100, (current / max) * 100) : 0;
                       return <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 w-full transition-all duration-500" style={{ width: `${percent}%` }} />;
                     })()}
                   </div>
                 </div>
               </div>

               <div className="mt-8 pt-6 border-t border-white/10">
                 <div className="flex items-start gap-3 text-blue-200 mb-6 bg-blue-500/10 p-4 rounded-2xl border border-blue-500/20">
                   <AlertCircle className="w-5 h-5 shrink-0 text-blue-400" />
                   <p className="text-xs font-light leading-relaxed">Upgrade to Pro to unlock more interviews, deep analytics, and premium reports.</p>
                 </div>
                 <div className="space-y-3">
                   <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                     onClick={() => setSelectedPlan("pro_plan_monthly")} 
                     className={`w-full py-3 rounded-2xl font-medium transition-all shadow-sm border text-sm ${selectedPlan === "pro_plan_monthly" ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]" : "bg-[#0D1326] text-slate-400 hover:text-white hover:border-white/20 border-white/5"}`}
                   >
                     Upgrade to Pro Monthly (₹150)
                   </motion.button>
                   <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                     onClick={() => setSelectedPlan("pro_plan_yearly")} 
                     className={`w-full py-3 rounded-2xl font-medium transition-all shadow-sm border text-sm ${selectedPlan === "pro_plan_yearly" ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]" : "bg-[#0D1326] text-slate-400 hover:text-white hover:border-white/20 border-white/5"}`}
                   >
                     Upgrade to Pro Yearly (₹999)
                   </motion.button>
                   <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                     onClick={() => setSelectedPlan("extra_interview_20")} 
                     className={`w-full py-3 rounded-2xl font-medium transition-all shadow-sm border text-sm ${selectedPlan === "extra_interview_20" ? "bg-blue-600/20 text-blue-400 border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.2)]" : "bg-[#0D1326] text-slate-400 hover:text-white hover:border-white/20 border-white/5"}`}
                   >
                     Buy 1 Extra Interview (₹20)
                   </motion.button>
                 </div>
                 <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} onClick={() => handleCheckout(selectedPlan)} className="w-full mt-6 py-3.5 rounded-full bg-white text-slate-900 font-bold hover:bg-slate-100 transition-colors shadow-lg">
                   Proceed to Payment
                 </motion.button>
               </div>
            </motion.div>
          </div>

        </div>
      </main>
    </div>
  );
}
