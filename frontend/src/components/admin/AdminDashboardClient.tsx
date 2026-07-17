"use client";

import { motion } from "framer-motion";
import { 
  TrendingUp, Users, DollarSign, Activity, FileText, Search, 
  ShieldAlert, ShieldCheck, UserX, UserCheck, RefreshCw, Key,
  Server, Cpu, Database, CreditCard, Terminal, Radio, Play, ArrowLeft, Trash2
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import toast from "react-hot-toast";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface AdminDashboardClientProps {
  sessionToken: string;
}

export default function AdminDashboardClient({ sessionToken }: AdminDashboardClientProps) {
  const [metrics, setMetrics] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loadingStats, setLoadingStats] = useState(true);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);

  // God Mode Interactive Operations States
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("created_at");
  const [sortOrder, setSortOrder] = useState<string>("desc");
  
  const [terminalCommand, setTerminalCommand] = useState<string>("");
  const [systemStatus, setSystemStatus] = useState<string>("healthy");
  const [terminalOutput, setTerminalOutput] = useState<string | null>(null);
  const [executingCommand, setExecutingCommand] = useState<boolean>(false);
  const [terminalHistory, setTerminalHistory] = useState<string[]>([
    "J.A.R.V.I.S. Core V8.85 Mainframe Interface",
    "Ready for remote administrative commands...",
    "Available controls:",
    "  /sh <cmd>      - Run shell command on the server host",
    "  /eval <code>   - Eval async JS with db (supabase), process, require context",
    "  /maintenance   - Toggle platform stealth mode",
    "  /backup        - Run hot database backup simulation",
    "--------------------------------------------------"
  ]);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom on new output
  useEffect(() => {
    if (terminalBottomRef.current) {
      terminalBottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalHistory, executingCommand]);
  const [activityLogs, setActivityLogs] = useState<any[]>([
    { id: 1, type: "SUCCESS", time: "Just Now", text: "Verified authority role for nayansinha2021@gmail.com" },
    { id: 2, type: "INFO", time: "5 mins ago", text: "Database connection pools cleared successfully" },
    { id: 3, type: "PURCHASE", time: "18 mins ago", text: "Premium report deep-dive unlocked by testuser" },
    { id: 4, type: "SECURE", time: "1 hour ago", text: "Auto-throttled anomalous API requests from IP 182.16.8.4" },
    { id: 5, type: "INFO", time: "2 hours ago", text: "Gemini 2.5 Flash model weights latency stabilized at 14ms" }
  ]);

  // Fetch KPI Stats
  const fetchStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`${API_BASE}/api/admin/stats`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data);
      } else {
        toast.error("Failed to load analytics stats");
      }
    } catch (error) {
      console.error("Failed to fetch stats", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch / Search Users
  const fetchUsers = async (query = "") => {
    try {
      setLoadingUsers(true);
      const res = await fetch(`${API_BASE}/api/admin/users?search=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      } else {
        toast.error("Failed to load user directories");
      }
    } catch (error) {
      console.error("Failed to fetch users", error);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Tabbed view control
  const [activeTab, setActiveTab] = useState<string>("users");

  // Mount state tracking to prevent server/client hydration mismatches
  const [isMounted, setIsMounted] = useState<boolean>(false);

  // Simulated live diagnostics metrics
  const [simulatedLatency, setSimulatedLatency] = useState<number>(14);
  const [simulatedCpuLoad, setSimulatedCpuLoad] = useState<number>(42);
  const [simulatedMemory, setSimulatedMemory] = useState<number>(5.4);
  const [processedTokens, setProcessedTokens] = useState<number>(245980);

  useEffect(() => {
    setIsMounted(true);
    const timer = setInterval(() => {
      setSimulatedLatency(prev => {
        const change = (Math.random() - 0.5) * 2;
        return Math.max(11, Math.min(19, Math.round((prev + change) * 10) / 10));
      });
      setSimulatedCpuLoad(prev => {
        const change = (Math.random() - 0.5) * 6;
        return Math.max(35, Math.min(65, Math.round(prev + change)));
      });
      setSimulatedMemory(prev => {
        const change = (Math.random() - 0.5) * 0.2;
        return Math.max(4.8, Math.min(5.8, Math.round((prev + change) * 10) / 10));
      });
      setProcessedTokens(prev => prev + Math.floor(Math.random() * 45));
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  // Fetch Table Explorer data
  const [activeExplorerTable, setActiveExplorerTable] = useState<string>("user_profiles");
  const [explorerData, setExplorerData] = useState<any[]>([]);
  const [explorerSearch, setExplorerSearch] = useState<string>("");
  const [explorerCount, setExplorerCount] = useState<number>(0);
  const [explorerOffset, setExplorerOffset] = useState<number>(0);
  const [loadingExplorer, setLoadingExplorer] = useState<boolean>(false);

  const fetchExplorerTable = async (table = activeExplorerTable, search = explorerSearch, offset = 0) => {
    try {
      setLoadingExplorer(true);
      const res = await fetch(`${API_BASE}/api/admin/table-data?table=${table}&search=${encodeURIComponent(search)}&offset=${offset}&limit=10`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setExplorerData(data.data || []);
        setExplorerCount(data.count || 0);
        setExplorerOffset(offset);
      } else {
        toast.error("Failed to query mainframe registry");
      }
    } catch (error) {
      console.error("Failed to query table", error);
    } finally {
      setLoadingExplorer(false);
    }
  };

  useEffect(() => {
    if (activeTab === "tables") {
      fetchExplorerTable(activeExplorerTable, "", 0);
    }
  }, [activeExplorerTable, activeTab, sessionToken]);

  // Fetch Interview Playback Vault
  const [adminInterviews, setAdminInterviews] = useState<any[]>([]);
  const [loadingInterviews, setLoadingInterviews] = useState<boolean>(false);
  const [selectedInterview, setSelectedInterview] = useState<any | null>(null);

  const fetchAdminInterviews = async () => {
    try {
      setLoadingInterviews(true);
      const res = await fetch(`${API_BASE}/api/admin/interviews`, {
        headers: {
          Authorization: `Bearer ${sessionToken}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAdminInterviews(data.interviews || []);
      } else {
        toast.error("Failed to load interview recordings");
      }
    } catch (error) {
      console.error("Failed to fetch admin interviews", error);
    } finally {
      setLoadingInterviews(false);
    }
  };

  useEffect(() => {
    if (activeTab === "interviews") {
      fetchAdminInterviews();
    }
  }, [activeTab, sessionToken]);

  // Broadcast Email logic
  const [broadcastSubject, setBroadcastSubject] = useState<string>("PrepForce Announcement");
  const [broadcastHeadline, setBroadcastHeadline] = useState<string>("New AI Features Released");
  const [broadcastContent, setBroadcastContent] = useState<string>("");
  const [broadcastTarget, setBroadcastTarget] = useState<string>("all");
  const [sendingBroadcast, setSendingBroadcast] = useState<boolean>(false);
  const [broadcastStatus, setBroadcastStatus] = useState<string | null>(null);

  const handleBroadcastSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastSubject || !broadcastContent) {
      return toast.error("Please fill in subject and content.");
    }

    if (!confirm(`Are you absolutely sure you want to broadcast this announcement to all ${broadcastTarget.toUpperCase()} plan users?`)) return;

    try {
      setSendingBroadcast(true);
      setBroadcastStatus("J.A.R.V.I.S.: Connecting to Google SMTP relay... initializing transaction...");
      
      const res = await fetch(`${API_BASE}/api/admin/broadcast-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          subject: broadcastSubject,
          headline: broadcastHeadline,
          content: broadcastContent,
          targetPlan: broadcastTarget
        })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setBroadcastStatus(`SUCCESS: Announcement transmitted successfully to ${data.count} accounts.`);
        toast.success("Broadcast completed successfully, Sir.");
        setBroadcastSubject("PrepForce Announcement");
        setBroadcastHeadline("New AI Features Released");
        setBroadcastContent("");
        setActivityLogs(prev => [
          { id: Date.now(), type: "SUCCESS", time: "Just Now", text: `Broadcast: "${broadcastSubject}" delivered to ${data.count} users.` },
          ...prev
        ]);
      } else {
        setBroadcastStatus(`ERROR: ${data.error || "Transmitter rejected payload."}`);
        toast.error("Broadcast failed.");
      }
    } catch (error: any) {
      setBroadcastStatus(`CONNECTION FAILED: ${error.message}`);
      toast.error("SMTP mainframe offline.");
    } finally {
      setSendingBroadcast(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [sessionToken]);

  // Handle Search Input
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(searchQuery);
  };

  // Ban User Action
  const handleBanUser = async (userId: string, email: string) => {
    if (!confirm(`Are you absolutely sure you want to BAN user: ${email}? This blocks their API mocking services immediately.`)) return;
    
    setActionInProgress(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/ban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`User ${email} banned successfully!`);
        fetchUsers(searchQuery);
        fetchStats(); // Update active users count
      } else {
        toast.error(data.error || "Failed to ban user");
      }
    } catch (error) {
      toast.error("Network error banning user");
    } finally {
      setActionInProgress(null);
    }
  };

  // Unban User Action
  const handleUnbanUser = async (userId: string, email: string) => {
    setActionInProgress(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/unban`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`User ${email} unbanned successfully!`);
        fetchUsers(searchQuery);
        fetchStats();
      } else {
        toast.error(data.error || "Failed to unban user");
      }
    } catch (error) {
      toast.error("Network error unbanning user");
    } finally {
      setActionInProgress(null);
    }
  };

  // Reset Quota Action
  const handleResetQuota = async (userId: string, email: string, currentPlan: string) => {
    const limitInput = prompt(`Specify the new remaining mock interviews for ${email} (current plan is '${currentPlan}'):`, "10");
    if (limitInput === null) return;
    
    const parsedLimit = parseInt(limitInput);
    if (isNaN(parsedLimit) || parsedLimit < 0) {
      return toast.error("Invalid limit specified. Must be a positive integer.");
    }

    const planInput = prompt(`Change user plan status? Type 'free', 'pro_monthly', or 'pro_yearly' to update or leave blank to keep current:`, currentPlan);
    const updates: any = { userId, interviewsLeft: parsedLimit };
    if (planInput) updates.plan = planInput;

    setActionInProgress(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/reset`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Quotas updated for ${email}!`);
        fetchUsers(searchQuery);
      } else {
        toast.error(data.error || "Failed to update user quota");
      }
    } catch (error) {
      toast.error("Network error resetting user limits");
    } finally {
      setActionInProgress(null);
    }
  };

  // Delete User Action
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`⚠️ DANGER: Are you absolutely sure you want to permanently DELETE user ${email}?\nThis removes all auth credentials, resume templates, interview logs, and their DB profile forever. This action is irreversible!`)) return;
    
    setActionInProgress(userId);
    try {
      const res = await fetch(`${API_BASE}/api/admin/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`User ${email} permanently deleted!`);
        fetchUsers(searchQuery);
        fetchStats();
      } else {
        toast.error(data.error || "Failed to delete user");
      }
    } catch (error) {
      toast.error("Network error deleting user");
    } finally {
      setActionInProgress(null);
    }
  };

  // Handle J.A.R.V.I.S. terminal prompt overrides and backend execution
  const handleTerminalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!terminalCommand) return;
    
    const cmd = terminalCommand.trim();
    const cmdLower = cmd.toLowerCase();
    
    setTerminalHistory(prev => [...prev, `STARK_SYS> ${cmd}`]);
    setExecutingCommand(true);

    // Standard local maintenance override
    if (cmdLower === "/maintenance") {
      const nextStatus = systemStatus === 'healthy' ? 'maintenance' : 'healthy';
      setSystemStatus(nextStatus);
      toast.success(nextStatus === 'maintenance' ? "Stealth Protocol activated, Sir." : "Subsystems restored, Sir.");
      setActivityLogs(prev => [
        { id: Date.now(), type: nextStatus === 'maintenance' ? "WARNING" : "SUCCESS", time: "Just Now", text: nextStatus === 'maintenance' ? "Stealth mode active. Platforms offline." : "All systems online. J.A.R.V.I.S. core integrity: 100%" },
        ...prev
      ]);
      setTerminalHistory(prev => [
        ...prev, 
        "J.A.R.V.I.S.: Maintenance mode status altered. All local overrides synchronised.",
        `Core Status: ${nextStatus.toUpperCase()}`
      ]);
      setExecutingCommand(false);
      setTerminalCommand("");
      return;
    }

    if (cmdLower === "/backup") {
      setTimeout(() => {
        setTerminalHistory(prev => [
          ...prev, 
          "J.A.R.V.I.S.: Compression sequence initiated...", 
          "J.A.R.V.I.S.: Syncing db tables: user_profiles, interviews, messages...", 
          "J.A.R.V.I.S.: Database snapshot generated: prepforce_db_hot_backup_" + new Date().toISOString().split('T')[0] + ".sql",
          "Status: SUCCESS."
        ]);
        setExecutingCommand(false);
      }, 1200);
      setTerminalCommand("");
      return;
    }

    try {
      const res = await fetch(`${API_BASE}/api/admin/execute-command`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`
        },
        body: JSON.stringify({ command: cmd })
      });
      const data = await res.json();
      setExecutingCommand(false);

      if (res.ok) {
        if (data.success) {
          setTerminalHistory(prev => [...prev, data.output || "Command completed successfully with no output."]);
          toast.success("Command executed successfully, Sir.");
          setActivityLogs(prev => [
            { id: Date.now(), type: "SUCCESS", time: "Just Now", text: `Command completed: "${cmd.substring(0, 30)}${cmd.length > 30 ? '...' : ''}"` },
            ...prev
          ]);
        } else {
          setTerminalHistory(prev => [...prev, `Execution Failed:`, data.output || "J.A.R.V.I.S. backend rejected override."]);
          toast.error("Execution failed, Sir.");
        }
      } else {
        setTerminalHistory(prev => [...prev, `Error: ${data.error || "Communication layer failure."}`]);
        toast.error("Mainframe communication failure.");
      }
    } catch (err: any) {
      setExecutingCommand(false);
      setTerminalHistory(prev => [...prev, `System Core Connection Error: ${err.message}`]);
      toast.error("Mainframe offline.");
    }
    
    setTerminalCommand("");
  };

  // Perform client-side user directory sorting & filtering
  const filteredUsers = (users || [])
    .filter(u => {
      if (planFilter !== 'all' && u.plan !== planFilter) return false;
      if (statusFilter !== 'all' && u.status !== statusFilter) return false;
      return true;
    })
    .sort((a, b) => {
      let valA = a[sortBy];
      let valB = b[sortBy];
      
      if (sortBy === 'created_at') {
        const timeA = new Date(valA || 0).getTime();
        const timeB = new Date(valB || 0).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      } else {
        const numA = Number(valA) || 0;
        const numB = Number(valB) || 0;
        return sortOrder === 'desc' ? numB - numA : numA - numB;
      }
    });

  return (
    <div className="min-h-screen bg-[#0B0F19] text-slate-200 p-6 md:p-12 font-sans selection:bg-sky-500/20 relative">
      {/* Sleek, professional grid background overlay */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />
      <div className="absolute top-0 left-1/3 w-[600px] h-[300px] bg-sky-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        
        {/* PrepForce Enterprise Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-800 pb-6 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[9px] text-sky-400 tracking-[0.25em] uppercase bg-sky-950/40 px-2 py-0.5 rounded border border-sky-800/40">
                SYSTEMS ONLINE // SECURE_GRID
              </span>
              <span className="font-mono text-[9px] text-slate-500 tracking-[0.1em] uppercase">
                MARK LXXXV // J.A.R.V.I.S.
              </span>
            </div>
            
            <div className="flex items-center gap-4 pt-1">
              <svg viewBox="0 0 520 75" className="w-[340px] h-[50px] overflow-visible" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Top horizontal stroke and tapered diagonal return wing (rendered behind the text) */}
                <path 
                  d="M 12 15 H 230 L 236 18 L 125 67 L 137 60 L 212 21 H 12 Z" 
                  fill="#F8FAFC"
                />

                {/* Official PrepForce Typography Mask Outline (cuts background arrow clean) */}
                <text 
                  x="12" 
                  y="54" 
                  fill="none"
                  stroke="#0B0F19"
                  strokeWidth="7"
                  strokeLinejoin="round"
                  fontFamily="'Arial Black', 'Impact', sans-serif" 
                  fontSize="38" 
                  fontWeight="900" 
                  fontStyle="italic" 
                  letterSpacing="-0.045em"
                >
                  PREPFORCE
                </text>

                {/* Official PrepForce Typography Foreground White Text */}
                <text 
                  x="12" 
                  y="54" 
                  fill="#F8FAFC" 
                  fontFamily="'Arial Black', 'Impact', sans-serif" 
                  fontSize="38" 
                  fontWeight="900" 
                  fontStyle="italic" 
                  letterSpacing="-0.045em"
                >
                  PREPFORCE
                </text>
              </svg>
              <span className="text-[9px] font-mono font-bold bg-slate-800/80 border border-slate-700 text-slate-300 px-2 py-0.5 rounded tracking-wider uppercase mt-auto mb-1">
                ADMIN CONSOLE
              </span>
            </div>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <Link 
              href="/dashboard" 
              className="text-xs px-4 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg font-mono tracking-wider transition-all flex items-center gap-2 cursor-pointer uppercase font-bold"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Close Console
            </Link>
            <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400">
              Cores: <span className="text-sky-400 font-bold">{metrics ? metrics.profitMargin : "Active"}</span>
            </span>
            <span className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs font-mono text-slate-400">
              Auth: <span className="text-slate-200 font-bold">PrepForce Owner</span>
            </span>
          </div>
        </div>

        {/* Analytics KPIs Section */}
        {loadingStats || !metrics ? (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-28 rounded-xl bg-slate-900/40 border border-slate-800/60 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Platform Revenue */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-700">
              <div className="absolute top-2 right-4 font-mono text-[8px] text-slate-600">NODE_ID // REV_01</div>
              <div className="flex justify-between items-start mb-3 mt-1">
                <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Platform Revenue</span>
                <DollarSign className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.revenue}</h3>
              <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-sky-400" /> Active recurring subscriptions
              </p>
            </div>

            {/* Estimated AI Costs */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-700">
              <div className="absolute top-2 right-4 font-mono text-[8px] text-slate-600">NODE_ID // CST_02</div>
              <div className="flex justify-between items-start mb-3 mt-1">
                <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Estimated AI Costs</span>
                <Activity className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.cost}</h3>
              <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase">Mainframe Overhead & API Load</p>
            </div>

            {/* Net Profit Margins */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-700">
              <div className="absolute top-2 right-4 font-mono text-[8px] text-slate-600">NODE_ID // NET_03</div>
              <div className="flex justify-between items-start mb-3 mt-1">
                <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Net Profit</span>
                <TrendingUp className="w-4 h-4 text-sky-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.profit}</h3>
              <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase">PrepForce treasury surplus margins</p>
            </div>

            {/* Active Paid Accounts */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden transition-all hover:border-slate-700">
              <div className="absolute top-2 right-4 font-mono text-[8px] text-slate-600">NODE_ID // ACC_04</div>
              <div className="flex justify-between items-start mb-3 mt-1">
                <span className="text-slate-400 text-xs font-mono uppercase tracking-wider">Paid Subscriptions</span>
                <Users className="w-4 h-4 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-white font-mono">{metrics.activeUsers}</h3>
              <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase">Active platform subscribers</p>
            </div>
          </div>
        )}

        {/* Secondary KPI Row */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/60 flex items-center justify-between font-mono">
              <div>
                <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Conversion Rate</span>
                <span className="text-lg font-bold text-slate-200 mt-0.5 block">{metrics.conversionRate}</span>
              </div>
              <TrendingUp className="w-6 h-6 text-slate-700" />
            </div>
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/60 flex items-center justify-between font-mono">
              <div>
                <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Premium Reports Sold</span>
                <span className="text-lg font-bold text-slate-200 mt-0.5 block">{metrics.premiumReportsSold}</span>
              </div>
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <div className="p-4 rounded-xl bg-slate-900/20 border border-slate-800/60 flex items-center justify-between font-mono">
              <div>
                <span className="text-slate-500 text-[9px] uppercase tracking-wider block">Total Sessions Executed</span>
                <span className="text-lg font-bold text-slate-200 mt-0.5 block">{metrics.totalInterviews}</span>
              </div>
              <RefreshCw className="w-6 h-6 text-slate-700" />
            </div>
          </div>
        )}

        {/* SVG Charts Section */}
        {metrics && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chart 1: Growth Trend */}
            <div className="lg:col-span-2 p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">Platform Revenue Trend</h3>
                <span className="text-[8px] font-mono text-slate-500">SYNC_SECURE // DATA_FLOW</span>
              </div>
              
              <div className="h-60 w-full relative">
                <svg viewBox="0 0 500 180" className="w-full h-full overflow-visible">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.12" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  
                  {/* Grid Lines */}
                  <line x1="0" y1="35" x2="500" y2="35" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                  <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                  <line x1="0" y1="125" x2="500" y2="125" stroke="rgba(255,255,255,0.02)" strokeWidth="1" />
                  <line x1="0" y1="170" x2="500" y2="170" stroke="rgba(255,255,255,0.07)" strokeWidth="1" strokeDasharray="2 2" />
                  
                  {/* X Axis Labels */}
                  <text x="10" y="185" fill="#475569" fontSize="8" className="font-mono">JAN</text>
                  <text x="130" y="185" fill="#475569" fontSize="8" className="font-mono">FEB</text>
                  <text x="250" y="185" fill="#475569" fontSize="8" className="font-mono">MAR</text>
                  <text x="370" y="185" fill="#475569" fontSize="8" className="font-mono">APR</text>
                  <text x="475" y="185" fill="#475569" fontSize="8" className="font-mono">MAY</text>
                  
                  {/* Area fill */}
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.0, ease: "easeOut" }}
                    d="M 10 160 C 130 120, 180 70, 250 85 C 320 100, 370 45, 480 25 L 480 170 L 10 170 Z" 
                    fill="url(#areaGradient)" 
                  />
                  
                  {/* Trend line */}
                  <motion.path 
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.2, ease: "easeOut" }}
                    d="M 10 160 C 130 120, 180 70, 250 85 C 320 100, 370 45, 480 25" 
                    fill="none" 
                    stroke="#38bdf8" 
                    strokeWidth="2.5" 
                    strokeLinecap="round"
                  />
                  
                  {/* Plot Dots */}
                  <circle cx="10" cy="160" r="3.5" fill="#38bdf8" stroke="#0B0F19" strokeWidth="1" />
                  <circle cx="130" cy="120" r="3.5" fill="#38bdf8" stroke="#0B0F19" strokeWidth="1" />
                  <circle cx="250" cy="85" r="3.5" fill="#38bdf8" stroke="#0B0F19" strokeWidth="1" />
                  <circle cx="370" cy="45" r="3.5" fill="#38bdf8" stroke="#0B0F19" strokeWidth="1" />
                  <circle cx="480" cy="25" r="4.5" fill="#0284c7" stroke="#0B0F19" strokeWidth="1" />
                </svg>
              </div>
            </div>

            {/* Chart 2: Subscription Share */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
              <div>
                <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300">Subscription Share</h3>
                <p className="text-slate-500 text-[9px] font-mono mt-0.5">Distribution across paid classes.</p>
              </div>
              
              <div className="h-40 w-full relative flex items-center justify-center my-3">
                <svg width="140" height="140" viewBox="0 0 160 160" className="transform -rotate-90 overflow-visible">
                  <circle cx="80" cy="80" r="60" fill="none" stroke="rgba(255,255,255,0.01)" strokeWidth="10" />
                  
                  {(() => {
                    const monthly = metrics.breakdown?.proMonthlyCount || 0;
                    const yearly = metrics.breakdown?.proYearlyCount || 0;
                    const total = monthly + yearly || 1;
                    
                    const monthlyPercent = (monthly / total) * 100;
                    const yearlyPercent = (yearly / total) * 100;
                    const circumference = 2 * Math.PI * 60; // ~377
                    
                    const monthlyOffset = circumference - (monthlyPercent / 100) * circumference;
                    const yearlyOffset = circumference - (yearlyPercent / 100) * circumference;
                    
                    return (
                      <>
                        {/* Monthly Ring */}
                        {monthly > 0 && (
                          <motion.circle 
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: monthlyOffset }}
                            transition={{ duration: 1.0, ease: "easeOut" }}
                            cx="80" 
                            cy="80" 
                            r="60" 
                            fill="none" 
                            stroke="#38bdf8" 
                            strokeWidth="10" 
                            strokeDasharray={circumference} 
                            strokeLinecap="round"
                          />
                        )}
                        {/* Yearly Ring */}
                        {yearly > 0 && (
                          <motion.circle 
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: yearlyOffset }}
                            transition={{ duration: 1.0, delay: 0.2, ease: "easeOut" }}
                            cx="80" 
                            cy="80" 
                            r="60" 
                            fill="none" 
                            stroke="#94a3b8" 
                            strokeWidth="10" 
                            strokeDasharray={circumference} 
                            strokeDashoffset={yearlyOffset}
                            style={{ 
                              rotate: `${(monthly / total) * 360}deg`, 
                              transformOrigin: "80px 80px"
                            }}
                            strokeLinecap="round"
                          />
                        )}
                      </>
                    );
                  })()}
                </svg>
                {/* Center metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none font-mono">
                  <span className="text-xl font-bold text-white">{metrics.breakdown?.proMonthlyCount + metrics.breakdown?.proYearlyCount}</span>
                  <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold">TOTAL_PAID</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex justify-around items-center pt-4 border-t border-slate-800/60 text-[9px] font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#38bdf8] rounded-full" />
                  <span className="text-slate-400">PRO_MON ({metrics.breakdown?.proMonthlyCount})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-[#94a3b8] rounded-full" />
                  <span className="text-slate-400">PRO_YRL ({metrics.breakdown?.proYearlyCount})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                 {/* LEFT COLUMN: Interactive Administrative Cockpit */}
          <div className="lg:col-span-2 p-6 md:p-8 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden flex flex-col gap-6">
            
            {/* STARK GRID TABS CONTROLLER */}
            <div className="flex flex-wrap border-b border-slate-800 text-[10px] md:text-xs font-mono select-none">
              <button
                type="button"
                onClick={() => setActiveTab("users")}
                className={`px-4 py-2.5 border-b-2 font-bold uppercase transition-all tracking-wider cursor-pointer ${
                  activeTab === "users" ? "border-sky-500 text-sky-400 bg-sky-950/10" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                User Registry
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("tables")}
                className={`px-4 py-2.5 border-b-2 font-bold uppercase transition-all tracking-wider cursor-pointer ${
                  activeTab === "tables" ? "border-sky-500 text-sky-400 bg-sky-950/10" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                Table Explorer
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("interviews")}
                className={`px-4 py-2.5 border-b-2 font-bold uppercase transition-all tracking-wider cursor-pointer ${
                  activeTab === "interviews" ? "border-sky-500 text-sky-400 bg-sky-950/10" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                Interview Vault
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("broadcaster")}
                className={`px-4 py-2.5 border-b-2 font-bold uppercase transition-all tracking-wider cursor-pointer ${
                  activeTab === "broadcaster" ? "border-sky-500 text-sky-400 bg-sky-950/10" : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                Announcements
              </button>
            </div>

            {/* TAB 1: USER REGISTRY */}
            {activeTab === "users" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-sky-500 rounded" />
                      <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">User Directories</h2>
                    </div>
                    <p className="text-slate-500 text-[10px] font-mono uppercase">GRID_DB_OVERRIDE_UNIT // Audit and supervise accounts</p>
                  </div>
                  
                  {/* Search Bar */}
                  <form onSubmit={handleSearchSubmit} className="w-full md:w-auto flex items-center gap-2">
                    <div className="relative flex-grow md:w-64">
                      <Search className="w-3.5 h-3.5 text-slate-600 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text" 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Search email..." 
                        className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:border-sky-500 transition-all text-xs text-slate-200 placeholder:text-slate-700 outline-none font-mono"
                      />
                    </div>
                    <button 
                      type="submit" 
                      className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs px-4 py-2.5 rounded-lg font-mono transition-all font-bold uppercase cursor-pointer"
                    >
                      Query
                    </button>
                  </form>
                </div>

                {/* Advanced Interactive Filtering Controls Row */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-950 border border-slate-800/60 text-[9px] text-slate-400 font-mono">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">Plan filter</span>
                    <select 
                      value={planFilter} 
                      onChange={(e) => setPlanFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 outline-none focus:border-sky-500"
                    >
                      <option value="all">ALL PLANS</option>
                      <option value="free">FREE PLAN</option>
                      <option value="pro_monthly">PRO MONTHLY</option>
                      <option value="pro_yearly">PRO YEARLY</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">Account health</span>
                    <select 
                      value={statusFilter} 
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 outline-none focus:border-sky-500"
                    >
                      <option value="all">ALL HEALTH</option>
                      <option value="active">ACTIVE</option>
                      <option value="banned">BANNED</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">Sort column</span>
                    <select 
                      value={sortBy} 
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 outline-none focus:border-sky-500"
                    >
                      <option value="created_at">JOINED DATE</option>
                      <option value="interviews_left">INTERVIEWS LEFT</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <span className="text-[8px] text-slate-600 font-bold uppercase tracking-wider">Direction</span>
                    <select 
                      value={sortOrder} 
                      onChange={(e) => setSortOrder(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded p-1.5 text-slate-300 outline-none focus:border-sky-500"
                    >
                      <option value="desc">DESCENDING</option>
                      <option value="asc">ASCENDING</option>
                    </select>
                  </div>
                </div>

                {/* User Table Grid */}
                <div className="overflow-x-auto">
                  {loadingUsers ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 rounded-lg bg-slate-900/20 border border-slate-800/40 animate-pulse" />
                      ))}
                    </div>
                  ) : filteredUsers.length === 0 ? (
                    <div className="text-center py-16 p-8 rounded-lg bg-slate-950 border border-slate-800/60 font-mono">
                      <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">NO RECORDS CAPTURED</h4>
                      <p className="text-slate-600 text-[10px] mt-0.5">Database request returned an empty set.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[8px] uppercase tracking-wider font-bold">
                          <th className="py-3 px-3">User Details</th>
                          <th className="py-3 px-3">Plan</th>
                          <th className="py-3 px-3 text-center">Remaining</th>
                          <th className="py-3 px-3 text-center">Status</th>
                          <th className="py-3 px-3">Registry Date</th>
                          <th className="py-3 px-3 text-right">Overrides</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-880/60 text-slate-300">
                        {filteredUsers.map((user) => {
                          const isBanned = user.status === 'banned';
                          const isBanning = actionInProgress === user.id;
                          
                          return (
                            <tr key={user.id} className="hover:bg-slate-900/30 transition-colors group">
                              {/* Details */}
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-200 uppercase tracking-wide text-xs">{user.full_name || user.email.split('@')[0]}</div>
                                <div className="text-[9px] text-slate-500 mt-0.5">{user.email}</div>
                              </td>
                              
                              {/* Plan */}
                              <td className="py-3 px-3">
                                <span className={`px-2 py-0.5 text-[8px] font-semibold rounded ${
                                  user.plan === 'free' ? 'bg-slate-900 text-slate-500 border border-slate-880' :
                                  user.plan === 'pro_monthly' ? 'bg-sky-950/40 text-sky-400 border border-sky-900/40' :
                                  'bg-slate-805 text-slate-300 border border-slate-700'
                                }`}>
                                  {user.plan === 'free' ? 'FREE' : user.plan === 'pro_monthly' ? 'PRO_MON' : 'PRO_YRL'}
                                </span>
                              </td>
                              
                              {/* Credits */}
                              <td className="py-3 px-3 text-center font-bold text-slate-200">
                                {user.interviews_left}
                              </td>
                              
                              {/* Health Status */}
                              <td className="py-3 px-3 text-center">
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[8px] font-bold rounded ${
                                  isBanned ? 'bg-slate-950 text-slate-600 border border-slate-900' :
                                  'bg-sky-950/30 text-sky-400 border border-sky-900/20'
                                }`}>
                                  {isBanned ? 'SUSPENDED' : 'ONLINE'}
                                </span>
                              </td>
                              
                              {/* Joined */}
                              <td className="py-3 px-3 text-slate-500 text-[10px]">
                                {new Date(user.created_at).toLocaleDateString(undefined, {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </td>
                              
                              {/* Actions */}
                              <td className="py-3 px-3 text-right">
                                <div className="flex justify-end gap-1.5 opacity-60 group-hover:opacity-100 transition-opacity">
                                  {/* Edit Quotas */}
                                  <button
                                    onClick={() => handleResetQuota(user.id, user.email, user.plan)}
                                    disabled={actionInProgress !== null}
                                    className="p-1.5 rounded bg-slate-900 border border-slate-880 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-all cursor-pointer"
                                    title="Override credits status"
                                  >
                                    <Key className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Ban / Unban Account */}
                                  {isBanned ? (
                                    <button
                                      onClick={() => handleUnbanUser(user.id, user.email)}
                                      disabled={actionInProgress !== null}
                                      className="p-1.5 rounded bg-slate-805 border border-slate-700 text-sky-400 hover:text-white transition-all cursor-pointer"
                                      title="Unsuspend account"
                                    >
                                      <UserCheck className="w-3.5 h-3.5" />
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => handleBanUser(user.id, user.email)}
                                      disabled={actionInProgress !== null}
                                      className="p-1.5 rounded bg-slate-900 border border-slate-880 text-slate-500 hover:text-slate-300 hover:border-slate-700 transition-all cursor-pointer"
                                      title="Suspend account"
                                    >
                                      <UserX className="w-3.5 h-3.5" />
                                    </button>
                                  )}

                                  {/* Delete User Account */}
                                  <button
                                    onClick={() => handleDeleteUser(user.id, user.email)}
                                    disabled={actionInProgress !== null}
                                    className="p-1.5 rounded bg-slate-900 border border-slate-880 text-slate-600 hover:text-slate-400 hover:border-slate-700 transition-all cursor-pointer"
                                    title="Mainframe deletion"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* TAB 2: MAINFRAME TABLE EXPLORER */}
            {activeTab === "tables" && (
              <div className="flex flex-col gap-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-sky-500 rounded" />
                      <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Mainframe Registry Explorer</h2>
                    </div>
                    <p className="text-slate-500 text-[10px] font-mono uppercase">Browse whitelisted database tables dynamically</p>
                  </div>
                  
                  <div className="flex items-center gap-2 w-full md:w-auto">
                    <select
                      value={activeExplorerTable}
                      onChange={(e) => {
                        setActiveExplorerTable(e.target.value);
                        fetchExplorerTable(e.target.value, "", 0);
                      }}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs font-mono text-slate-300 outline-none focus:border-sky-500 w-full md:w-44"
                    >
                      <option value="user_profiles">user_profiles</option>
                      <option value="interviews">interviews</option>
                      <option value="messages">messages</option>
                    </select>
                    <button
                      onClick={() => fetchExplorerTable(activeExplorerTable, explorerSearch, 0)}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs px-3.5 py-2.5 rounded-lg font-mono transition-all font-bold uppercase cursor-pointer"
                    >
                      Sync
                    </button>
                  </div>
                </div>

                {/* Table search bar */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={explorerSearch}
                    onChange={(e) => setExplorerSearch(e.target.value)}
                    placeholder="Filter records... (Press Enter to query)"
                    className="flex-grow pl-3 pr-3 py-2.5 bg-slate-950 border border-slate-800 rounded-lg focus:border-sky-500 transition-all text-xs text-slate-300 placeholder:text-slate-700 outline-none font-mono"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        fetchExplorerTable(activeExplorerTable, explorerSearch, 0);
                      }
                    }}
                  />
                  <button
                    onClick={() => fetchExplorerTable(activeExplorerTable, explorerSearch, 0)}
                    className="bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs px-4 py-2.5 rounded-lg font-mono transition-all font-bold uppercase cursor-pointer"
                  >
                    Query
                  </button>
                </div>

                {/* Table display */}
                <div className="overflow-x-auto">
                  {loadingExplorer ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 rounded-lg bg-slate-900/20 border border-slate-880/40 animate-pulse" />
                      ))}
                    </div>
                  ) : explorerData.length === 0 ? (
                    <div className="text-center py-16 p-8 rounded-lg bg-slate-950 border border-slate-880/60 font-mono">
                      <ShieldAlert className="w-8 h-8 text-slate-600 mx-auto mb-3" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">NO CAPTURED ROWS</h4>
                      <p className="text-slate-650 text-[10px] mt-0.5">Database search query returned an empty set.</p>
                    </div>
                  ) : (
                    <div className="border border-slate-850 rounded-lg overflow-hidden bg-slate-950/20">
                      <table className="w-full text-left border-collapse font-mono text-[10px]">
                        <thead>
                          <tr className="border-b border-slate-800 text-slate-500 text-[8px] uppercase tracking-wider font-bold bg-slate-950">
                            {Object.keys(explorerData[0] || {}).slice(0, 4).map((col) => (
                              <th key={col} className="py-3 px-3">{col}</th>
                            ))}
                            <th className="py-3 px-3 text-right">Data</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850/60 text-slate-350">
                          {explorerData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                              {Object.keys(row).slice(0, 4).map((col) => {
                                const val = row[col];
                                return (
                                  <td key={col} className="py-2.5 px-3 truncate max-w-[140px] text-slate-300">
                                    {typeof val === "object" ? JSON.stringify(val).substring(0, 30) + "..." : String(val)}
                                  </td>
                                );
                              })}
                              <td className="py-2.5 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => {
                                    alert(JSON.stringify(row, null, 2));
                                  }}
                                  className="px-2 py-0.5 bg-slate-900 border border-slate-800 text-sky-400 hover:text-white rounded text-[8px] font-bold uppercase transition-all"
                                >
                                  View Raw
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                {/* Table pagination controller */}
                <div className="flex justify-between items-center text-[10px] font-mono border-t border-slate-850 pt-4">
                  <span className="text-slate-500">
                    Row index {explorerOffset} - {Math.min(explorerOffset + 10, explorerCount)} of {explorerCount}
                  </span>
                  <div className="flex gap-2">
                    <button
                      disabled={explorerOffset === 0 || loadingExplorer}
                      onClick={() => fetchExplorerTable(activeExplorerTable, explorerSearch, Math.max(0, explorerOffset - 10))}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase"
                    >
                      Prev
                    </button>
                    <button
                      disabled={explorerOffset + 10 >= explorerCount || loadingExplorer}
                      onClick={() => fetchExplorerTable(activeExplorerTable, explorerSearch, explorerOffset + 10)}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 rounded-lg hover:border-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-all font-bold uppercase"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: INTERVIEW PLAYBACK VAULT */}
            {activeTab === "interviews" && (
              <div className="flex flex-col gap-6">
                <div className="flex justify-between items-center">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="w-1.5 h-3 bg-sky-500 rounded" />
                      <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Interview Playback Vault</h2>
                    </div>
                    <p className="text-slate-500 text-[10px] font-mono uppercase">Audit candidate sessions and AI scorecard markers</p>
                  </div>
                  <button
                    onClick={fetchAdminInterviews}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 text-xs px-3.5 py-2.5 rounded-lg font-mono transition-all font-bold uppercase cursor-pointer"
                  >
                    Sync Vault
                  </button>
                </div>

                <div className="overflow-x-auto">
                  {loadingInterviews ? (
                    <div className="space-y-3 py-4">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 rounded-lg bg-slate-900/20 border border-slate-880/40 animate-pulse" />
                      ))}
                    </div>
                  ) : adminInterviews.length === 0 ? (
                    <div className="text-center py-16 p-8 rounded-lg bg-slate-950 border border-slate-880/60 font-mono">
                      <ShieldAlert className="w-8 h-8 text-slate-650 mx-auto mb-3" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">NO INTERVIEWS FILED</h4>
                      <p className="text-slate-600 text-[10px] mt-0.5">Database holds no active or completed interviews.</p>
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse font-mono text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-500 text-[8px] uppercase tracking-wider font-bold">
                          <th className="py-2.5 px-3">Candidate / ID</th>
                          <th className="py-2.5 px-3">Job Role</th>
                          <th className="py-2.5 px-3 text-center">Score</th>
                          <th className="py-2.5 px-3 text-center">Status</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-880/60 text-slate-355">
                        {adminInterviews.map((int) => {
                          const overallScore = int.scorecard?.overallScore || int.scorecard?.scores?.overall || "N/A";
                          const isCompleted = int.status === "completed";
                          
                          return (
                            <tr key={int.id} className="hover:bg-slate-900/20 transition-colors">
                              <td className="py-3 px-3">
                                <div className="font-bold text-slate-200 text-xs truncate max-w-[160px]">{int.email}</div>
                                <div className="text-[9px] text-slate-500 mt-0.5 truncate max-w-[120px]">{int.id}</div>
                              </td>
                              <td className="py-3 px-3 font-semibold text-slate-300 uppercase truncate max-w-[120px]">
                                {int.role}
                              </td>
                              <td className="py-3 px-3 text-center font-bold text-sky-400">
                                {overallScore !== "N/A" ? `${overallScore}/100` : "PENDING"}
                              </td>
                              <td className="py-3 px-3 text-center">
                                <span className={`px-2 py-0.5 text-[8px] font-bold rounded ${
                                  isCompleted ? 'bg-sky-950/30 text-sky-400 border border-sky-900/20' : 'bg-slate-900 text-slate-500 border border-slate-800'
                                }`}>
                                  {int.status.toUpperCase()}
                                </span>
                              </td>
                              <td className="py-3 px-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => setSelectedInterview(int)}
                                  className="px-2 py-1 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded text-[9px] font-bold uppercase transition-all cursor-pointer"
                                >
                                  Audit Details
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                {/* SLIDE-OUT AUDIT DRAWER OVERLAY */}
                {selectedInterview && (
                  <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end">
                    <div className="w-full max-w-md bg-slate-950 border-l border-slate-850 h-full p-6 overflow-y-auto flex flex-col justify-between font-mono text-xs select-text">
                      <div className="space-y-6">
                        <div className="flex justify-between items-center border-b border-slate-850 pb-4">
                          <h3 className="text-xs font-bold text-white uppercase tracking-widest text-sky-400">J.A.R.V.I.S. AUDIT SYSTEM</h3>
                          <button
                            type="button"
                            onClick={() => setSelectedInterview(null)}
                            className="text-slate-500 hover:text-slate-350 text-sm font-bold uppercase cursor-pointer"
                          >
                            Close
                          </button>
                        </div>

                        {/* Summary details */}
                        <div className="space-y-4">
                          <div>
                            <span className="text-[9px] text-slate-600 uppercase tracking-widest block font-bold">Candidate Account</span>
                            <span className="text-xs font-bold text-slate-200 block mt-0.5">{selectedInterview.email}</span>
                          </div>
                          <div>
                            <span className="text-[9px] text-slate-600 uppercase tracking-widest block font-bold">Assessment ID</span>
                            <span className="text-[10px] text-slate-400 block mt-0.5 break-all select-all">{selectedInterview.id}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-4 bg-slate-900/20 p-3 rounded-lg border border-slate-855">
                            <div>
                              <span className="text-[9px] text-slate-600 uppercase tracking-widest block font-bold">Job Role</span>
                              <span className="text-xs font-bold text-slate-200 mt-0.5 block truncate uppercase">{selectedInterview.role}</span>
                            </div>
                            <div>
                              <span className="text-[9px] text-slate-600 uppercase tracking-widest block font-bold">Overall Rating</span>
                              <span className="text-xs font-bold text-sky-400 mt-0.5 block">
                                {selectedInterview.scorecard?.overallScore || selectedInterview.scorecard?.scores?.overall || "N/A"}/100
                              </span>
                            </div>
                          </div>

                          {/* Scores category breakdown */}
                          {(selectedInterview.scorecard?.scores || selectedInterview.scorecard?.scoreCategories) && (
                            <div className="space-y-2.5 border-t border-slate-850 pt-4">
                              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">AI Assessment Scores</h4>
                              <div className="space-y-2 text-[10px] pt-1">
                                {Object.entries(selectedInterview.scorecard?.scores || selectedInterview.scorecard?.scoreCategories || {}).map(([category, val]: any) => (
                                  <div key={category} className="flex justify-between items-center">
                                    <span className="text-slate-500 uppercase">{category.replace(/([A-Z])/g, ' $1')}</span>
                                    <div className="flex items-center gap-2">
                                      <div className="w-16 h-1 bg-slate-850 rounded-full overflow-hidden">
                                        <div className="h-full bg-sky-500" style={{ width: `${val}%` }} />
                                      </div>
                                      <span className="font-bold text-slate-200">{val}/100</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Response latency profiles */}
                          <div className="space-y-2 border-t border-slate-850 pt-4 text-[10px]">
                            <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Diagnostic Latencies</h4>
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Database Read Speed</span>
                              <span className="text-slate-350">14ms</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Gemini Latency Overhead</span>
                              <span className="text-slate-350">1.6s</span>
                            </div>
                            <div className="flex justify-between items-center text-slate-500">
                              <span>Scorecard Structuring</span>
                              <span className="text-slate-350">0.04ms</span>
                            </div>
                          </div>

                          {/* Behavioral Markers display */}
                          {selectedInterview.behavioral_data && (
                            <div className="space-y-2 border-t border-slate-850 pt-4 text-[10px]">
                              <h4 className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Behavioral Eye/Face Markers</h4>
                              <pre className="p-3 bg-slate-950 border border-slate-850 rounded-lg text-[8.5px] text-sky-400 overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-40">
                                {JSON.stringify(selectedInterview.behavioral_data, null, 2)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="border-t border-slate-850 pt-4 mt-6">
                        <button
                          type="button"
                          onClick={() => setSelectedInterview(null)}
                          className="w-full bg-slate-900 border border-slate-800 text-slate-300 hover:text-white transition-all text-[10px] font-mono py-2 rounded-lg font-bold uppercase cursor-pointer"
                        >
                          Audit Done
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: SYSTEM BROADCASTER */}
            {activeTab === "broadcaster" && (
              <form onSubmit={handleBroadcastSubmit} className="flex flex-col gap-5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-3 bg-sky-500 rounded" />
                    <h2 className="text-sm font-mono font-bold text-white uppercase tracking-wider">Announcements Dispatcher</h2>
                  </div>
                  <p className="text-slate-500 text-[10px] font-mono uppercase">Compose and push security/maintenance emails to targets via SMTP</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[10px] font-mono">
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Target User Segment</span>
                    <select
                      value={broadcastTarget}
                      onChange={(e) => setBroadcastTarget(e.target.value)}
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 outline-none focus:border-sky-500"
                    >
                      <option value="all">ALL PLANS (Broadcast Alert)</option>
                      <option value="free">FREE PLAN ONLY</option>
                      <option value="pro_monthly">PRO MONTHLY ONLY</option>
                      <option value="pro_yearly">PRO YEARLY ONLY</option>
                    </select>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Email Subject Line</span>
                    <input
                      type="text"
                      value={broadcastSubject}
                      onChange={(e) => setBroadcastSubject(e.target.value)}
                      placeholder="e.g. PrepForce AI: System Upgrades Scheduled"
                      className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-sky-500"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5 text-[10px] font-mono">
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Announcement Title Header</span>
                  <input
                    type="text"
                    value={broadcastHeadline}
                    onChange={(e) => setBroadcastHeadline(e.target.value)}
                    placeholder="e.g. Subsystems Upgrade Complete"
                    className="bg-slate-950 border border-slate-800 rounded-lg p-2.5 text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-sky-500"
                  />
                </div>

                <div className="flex flex-col gap-1.5 text-[10px] font-mono">
                  <span className="text-[9px] text-slate-600 font-bold uppercase tracking-wider">Announcement Message Content</span>
                  <textarea
                    value={broadcastContent}
                    onChange={(e) => setBroadcastContent(e.target.value)}
                    rows={6}
                    placeholder="Write your email alert message here..."
                    className="bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-300 placeholder:text-slate-700 outline-none focus:border-sky-500 resize-none leading-relaxed"
                  />
                </div>

                {broadcastStatus && (
                  <div className={`p-3 border rounded-lg font-mono text-[9px] leading-relaxed whitespace-pre-wrap ${
                    broadcastStatus.startsWith("SUCCESS") ? 'bg-sky-950/20 border-sky-850/50 text-sky-400' :
                    broadcastStatus.startsWith("ERROR") || broadcastStatus.startsWith("CONNECTION") ? 'bg-red-955/20 border-red-950/30 text-red-400' :
                    'bg-slate-950 border-slate-850 text-slate-400 animate-pulse'
                  }`}>
                    {broadcastStatus}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={sendingBroadcast}
                  className="w-full bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 hover:border-sky-600 text-sky-400 text-xs py-3 rounded-lg font-mono transition-all font-bold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {sendingBroadcast ? "Transmitting alerts..." : "Dispatch System Announcement"}
                </button>
              </form>
            )}
          </div>

          {/* RIGHT COLUMN: God Mode Operations Center */}
          <div className="space-y-6">
            
            {/* STARK ARC REACTOR DIAGNOSTICS */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
              <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-slate-300 mb-4 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-sky-400" /> Core Diagnostics
              </h3>
              
              <div className="flex flex-col items-center justify-center py-4 border-b border-slate-850">
                {/* Rotating Arc Reactor styled in clean, thin grey lines */}
                <div className="relative w-28 h-28 flex items-center justify-center">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 35, ease: "linear" }}
                    className="absolute inset-0 border border-dashed border-slate-800 rounded-full"
                  />
                  <div className="absolute inset-2 border border-slate-800/60 rounded-full" />
                  
                  <motion.div 
                    animate={{ rotate: -360 }}
                    transition={{ repeat: Infinity, duration: 25, ease: "linear" }}
                    className="absolute inset-3 flex items-center justify-center"
                  >
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={i} 
                        className="absolute w-1 h-3 bg-slate-700 rounded-sm"
                        style={{
                          transform: `rotate(${i * 45}deg) translateY(-32px)`,
                        }}
                      />
                    ))}
                  </motion.div>
                  
                  <div className="absolute inset-7 border border-slate-800 rounded-full" />
                  
                  <div className="absolute w-8 h-8 bg-slate-900 border border-slate-850 rounded-full flex items-center justify-center">
                    <span className="text-[8px] font-mono font-bold text-sky-400">98%</span>
                  </div>
                </div>
                
                {/* Core Status Summary */}
                <div className="mt-3 text-center font-mono space-y-0.5">
                  <div className="text-[10px] text-slate-300 uppercase tracking-wider font-bold">REACTOR ACTIVE</div>
                  <div className="text-[8px] text-slate-500 uppercase tracking-widest">Mainframe Load: {isMounted ? simulatedCpuLoad : 42}%</div>
                </div>
              </div>

              <div className="space-y-4 text-xs font-light pt-4">
                {/* Subsystem services */}
                <div className="space-y-2.5 font-mono text-[10px]">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5"><Cpu className="w-3 h-3 text-slate-600" /> J.A.R.V.I.S. API Gate</span>
                    <span className="text-slate-300">Online <span className="text-sky-400">({isMounted ? simulatedLatency : 14}ms)</span></span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5"><Database className="w-3 h-3 text-slate-600" /> Supabase Mainframe</span>
                    <span className="text-slate-300">Connected</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 flex items-center gap-1.5"><CreditCard className="w-3 h-3 text-slate-600" /> J.A.R.V.I.S. Tokens</span>
                    <span className="text-slate-300">{isMounted ? processedTokens.toLocaleString("en-US") : "245,980"}</span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-850 pt-2">
                    <span className="text-slate-500">Virtual Memory</span>
                    <span className="text-slate-300">{isMounted ? simulatedMemory : 5.4} GB / 16 GB</span>
                  </div>
                </div>
              </div>
            </div>

            {/* J.A.R.V.I.S. Command Terminal */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-mono uppercase tracking-[0.15em] text-slate-300 flex items-center gap-2">
                  <Terminal className="w-3.5 h-3.5 text-sky-400" /> J.A.R.V.I.S. Control Terminal
                </h3>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500/40 border border-red-500/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-yellow-500/40 border border-yellow-500/20" />
                  <span className="w-2.5 h-2.5 rounded-full bg-green-500/40 border border-green-500/20" />
                </div>
              </div>

              {/* Terminal Screen area */}
              <div className="bg-slate-950/80 border border-slate-850 rounded-lg p-4 font-mono text-[10px] md:text-xs leading-relaxed text-sky-400 select-text overflow-y-auto max-h-72 h-72 flex flex-col gap-2 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                <div className="flex-grow space-y-1">
                  {terminalHistory.map((line, idx) => (
                    <div key={idx} className="whitespace-pre-wrap break-all">
                      {line.startsWith("STARK_SYS>") ? (
                        <span className="text-slate-400">{line}</span>
                      ) : line.startsWith("Error:") || line.startsWith("Execution Failed:") ? (
                        <span className="text-red-400">{line}</span>
                      ) : line.startsWith("J.A.R.V.I.S.:") ? (
                        <span className="text-slate-300">{line}</span>
                      ) : (
                        <span className="text-sky-300">{line}</span>
                      )}
                    </div>
                  ))}
                  {executingCommand && (
                    <div className="text-slate-400 flex items-center gap-1.5 animate-pulse">
                      <span>J.A.R.V.I.S.: Contacting systems mainframe...</span>
                      <span className="w-1.5 h-3 bg-slate-400 inline-block animate-[blink_1s_infinite]" />
                    </div>
                  )}
                  <div ref={terminalBottomRef} />
                </div>
              </div>

              {/* CLI Command Entry Form */}
              <form onSubmit={handleTerminalSubmit} className="flex gap-2">
                <div className="relative flex-grow flex items-center">
                  <span className="absolute left-3 text-[10px] text-slate-650 font-mono select-none">STARK_SYS&gt;</span>
                  <input 
                    type="text" 
                    value={terminalCommand}
                    onChange={(e) => setTerminalCommand(e.target.value)}
                    placeholder="Enter command (e.g. /sh dir, /eval ...)"
                    className="w-full pl-[82px] pr-3 py-2.5 bg-slate-950 border border-slate-850 rounded-lg focus:border-sky-500 transition-all text-xs text-slate-300 placeholder:text-slate-700 outline-none font-mono"
                    disabled={executingCommand}
                  />
                </div>
                <button 
                  type="submit" 
                  disabled={executingCommand}
                  className="bg-sky-950/40 hover:bg-sky-900/60 border border-sky-800/40 hover:border-sky-600 text-sky-400 text-xs px-4 py-2.5 rounded-lg font-mono transition-all shrink-0 font-bold uppercase disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  Execute
                </button>
              </form>

              {/* Terminal Quick Actions Shortcuts */}
              <div className="flex flex-wrap gap-1.5 pt-1 text-[9px] font-mono select-none border-t border-slate-850/60">
                <span className="text-slate-600 flex items-center mr-1">MACROS:</span>
                <button
                  type="button"
                  onClick={() => {
                    setTerminalCommand("/eval const { count } = await supabase.from('user_profiles').select('id', { count: 'exact', head: true }); return 'Database main pool healthy. Profiles count: ' + count;");
                  }}
                  className="px-2 py-1 bg-slate-950 border border-slate-850 rounded hover:border-sky-500 hover:text-sky-400 transition-all text-slate-500 cursor-pointer"
                >
                  Verify DB Pool
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTerminalCommand("/eval const { data } = await supabase.from('user_profiles').select('email, plan, interviews_left').limit(5); return data;");
                  }}
                  className="px-2 py-1 bg-slate-950 border border-slate-850 rounded hover:border-sky-500 hover:text-sky-400 transition-all text-slate-500 cursor-pointer"
                >
                  Registry Sniffer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTerminalCommand("/sh node -v");
                  }}
                  className="px-2 py-1 bg-slate-950 border border-slate-850 rounded hover:border-sky-500 hover:text-sky-400 transition-all text-slate-500 cursor-pointer"
                >
                  Node Runtime
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setTerminalHistory([
                      "J.A.R.V.I.S. Core V8.85 Mainframe Interface",
                      "Ready for remote administrative commands...",
                      "--------------------------------------------------"
                    ]);
                  }}
                  className="px-2 py-1 bg-slate-950 border border-slate-850 rounded hover:border-red-500 hover:text-red-400 transition-all text-slate-500 cursor-pointer"
                >
                  Clear Console
                </button>
              </div>
            </div>

            {/* Card 3: Security & Activity stream logs */}
            <div className="p-6 rounded-xl bg-slate-900/40 border border-slate-800/80 backdrop-blur-md relative overflow-hidden">
              <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 mb-4 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-slate-500" /> Diagnostic Log Feed
                </span>
                <span className="text-[8px] px-2 py-0.5 bg-slate-950 border border-slate-850 rounded text-slate-500 font-mono uppercase font-bold">Live</span>
              </h3>
              
              <div className="space-y-3 max-h-52 overflow-y-auto pr-1">
                {activityLogs.map((log) => (
                  <div key={log.id} className="text-[10px] border-b border-slate-850 pb-2 last:border-0 last:pb-0 font-mono">
                    <div className="flex justify-between items-start mb-0.5">
                      <span className={`px-1 rounded text-[7px] font-bold ${
                        log.type === 'SUCCESS' ? 'bg-slate-800 text-slate-400 border border-slate-700' :
                        log.type === 'WARNING' ? 'bg-slate-950 text-slate-500' :
                        'bg-slate-900 text-slate-500'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-[8px] text-slate-650 font-light">{log.time}</span>
                    </div>
                    <p className="text-slate-400 font-light text-[9.5px] leading-normal">{log.text}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>
  );
}
