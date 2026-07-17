"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { User, Mail, Save, Home, ArrowLeft } from "lucide-react";
import Link from "next/link";
import PrepForceLogo from "@/components/PrepForceLogo";
import { motion } from "framer-motion";
import toast from "react-hot-toast";

export default function SettingsPage() {
  const [session, setSession] = useState<any>(null);
  const [fullName, setFullName] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState("javascript");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        router.push("/login");
        return;
      }
      
      setSession(session);
      setFullName(session.user.user_metadata?.full_name || "");

      // Fetch user profile for default language
      const { data } = await supabase.from('user_profiles').select('default_language').eq('id', session.user.id).single();
      if (data?.default_language) {
        setDefaultLanguage(data.default_language);
      }
    };
    fetchSession();
  }, [router]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const supabase = createClient();
      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: fullName }
      });

      if (authError) throw authError;

      // Update user_profiles table
      const { error: dbError } = await supabase.from('user_profiles').update({
        default_language: defaultLanguage
      }).eq('id', session.user.id);

      if (dbError) throw dbError;
      
      toast.success("Profile updated successfully!");
    } catch (error: any) {
      toast.error(error.message || "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  if (!session) return null; // loading state

  return (
    <div className="min-h-screen bg-[#0A0F1C] text-slate-100 selection:bg-blue-500/30 font-sans">
      {/* Top Navigation */}
      <nav className="border-b border-white/10 bg-[#0A0F1C]/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center group hover:opacity-80 transition-opacity">
            <PrepForceLogo className="w-[140px] h-[28px] mr-1" />
            <span className="text-slate-600 mx-2 font-light">|</span>
            <span className="font-semibold text-lg text-slate-400">Account Settings</span>
          </Link>
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer text-slate-400 hover:text-white" title="Go Back">
              <ArrowLeft className="w-4 h-4" />
            </button>
            <Link href="/" className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-all cursor-pointer text-slate-400 hover:text-white" title="Go to Home">
              <Home className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-6 py-12 relative">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] pointer-events-none" />
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-3xl bg-white/5 border border-white/10 shadow-2xl relative overflow-hidden backdrop-blur-xl">
          <div className="flex items-center gap-4 mb-8 pb-6 border-b border-white/10">
            <div className="w-16 h-16 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-2xl font-bold shadow-inner border border-blue-500/20">
              {fullName ? fullName[0].toUpperCase() : session.user.email?.[0].toUpperCase()}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Personal Details</h1>
              <p className="text-slate-400 font-light">Update your account information</p>
            </div>
          </div>

          <form onSubmit={handleUpdateProfile} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="email"
                  disabled
                  value={session.user.email || ""}
                  className="w-full pl-10 pr-4 py-3 bg-[#0A0F1C]/50 border border-white/5 rounded-xl text-slate-500 cursor-not-allowed shadow-inner font-light"
                />
              </div>
              <p className="text-xs text-slate-500 mt-2 font-light">Email changes require security verification and cannot be changed here.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Jane Doe"
                  className="w-full pl-10 pr-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white placeholder:text-slate-500 shadow-inner outline-none font-light"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Default Programming Language</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                className="w-full px-4 py-3 bg-[#0D1326] border border-white/10 rounded-xl focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-white shadow-inner outline-none font-light appearance-none cursor-pointer"
              >
                <option value="javascript" className="bg-[#0D1326] text-slate-200">JavaScript</option>
                <option value="python" className="bg-[#0D1326] text-slate-200">Python</option>
                <option value="cpp" className="bg-[#0D1326] text-slate-200">C++</option>
                <option value="java" className="bg-[#0D1326] text-slate-200">Java</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end">
              <button 
                type="submit" 
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-full font-medium shadow-[0_0_20px_rgba(37,99,235,0.4)] transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {loading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </motion.div>
      </main>
    </div>
  );
}
