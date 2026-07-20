"use client";

import { motion } from "framer-motion";
import { Send, CheckCircle2, ChevronDown, Play } from "lucide-react";
import { useState, Suspense, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import dynamic from "next/dynamic";
const Editor = dynamic(() => import("@monaco-editor/react"), { ssr: false });
import { problems, Problem } from "@/lib/problems";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function CodingRoomContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [isThinking, setIsThinking] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [currentProblem, setCurrentProblem] = useState<Problem>(problems[1]);
  const [language, setLanguage] = useState<string>("javascript");
  const [code, setCode] = useState<string>(problems[1].snippets.javascript);
  const router = useRouter();
  const [testResults, setTestResults] = useState<any[] | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDefaultLanguage = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data } = await supabase.from('user_profiles').select('default_language').eq('id', session.user.id).single();
        if (data?.default_language) {
          setLanguage(data.default_language);
          setCode(currentProblem.snippets[data.default_language] || currentProblem.snippets.javascript);
        }
      }
    };
    fetchDefaultLanguage();
  }, []);

  const [activeSessionId, setActiveSessionId] = useState<string>(() => {
    const raw = searchParams.get("sessionId");
    return !raw || raw.startsWith("coding-") || raw.startsWith("mock-") ? (raw || `coding-${crypto.randomUUID()}`) : `coding-${raw}`;
  });

  const handleLanguageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    setLanguage(newLang);
    setCode(currentProblem.snippets[newLang] || "");
  };

  const handleProblemChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const probId = e.target.value;
    const prob = problems.find(p => p.id === probId) || problems[1];
    setCurrentProblem(prob);
    setCode(prob.snippets[language] || "");
    setActiveSessionId(`coding-${crypto.randomUUID()}`);
    setAiFeedback(null);
    setExecutionOutput(null);
    setTestResults(null);
    setTestError(null);
  };

  const [isRunning, setIsRunning] = useState(false);
  const [executionOutput, setExecutionOutput] = useState<string | null>(null);

  const runCode = async () => {
     setIsRunning(true);
     setExecutionOutput(null);
     setTestResults(null);
     setTestError(null);

     try {
       const supabase = createClient();
       const { data: { session } } = await supabase.auth.getSession();

       if (language === "javascript") {
         let logs: string[] = [];
         const originalLog = console.log;
         try {
           console.log = (...args) => {
             logs.push(args.map(x => typeof x === 'object' ? JSON.stringify(x) : String(x)).join(' '));
           };

           let userFunction: Function;
           try {
             userFunction = new Function(code + `\nreturn ${currentProblem.functionName};`)();
           } catch (compileErr: any) {
             setTestError(`Compilation/Syntax Error: ${compileErr.message}`);
             setIsRunning(false);
             return;
           }

           const results = currentProblem.testCases.map((tc, index) => {
             let caseLogs: string[] = [];
             const prevLogsLength = logs.length;
             let actual: any;
             let passed = false;
             let runError: string | null = null;

             try {
               actual = userFunction(...JSON.parse(JSON.stringify(tc.input)));
               passed = JSON.stringify(actual) === JSON.stringify(tc.expected);
             } catch (err: any) {
               runError = err.message;
             }

             caseLogs = logs.slice(prevLogsLength);

             return {
               index: index + 1,
               input: JSON.stringify(tc.input),
               expected: JSON.stringify(tc.expected),
               actual: runError ? `Error: ${runError}` : JSON.stringify(actual),
               passed,
               logs: caseLogs,
               error: runError
             };
           });

           setTestResults(results);
           setIsRunning(false);

           const allPassed = results.every(r => r.passed);
           const summary = results.map(r => `Test Case ${r.index}: ${r.passed ? 'PASSED' : 'FAILED'} (Expected: ${r.expected}, Got: ${r.actual})${r.logs.length ? `\nLogs: ${r.logs.join('\n')}` : ''}`).join('\n\n');

           if (session?.user) {
             await supabase.from('coding_attempts').insert([{
               user_id: session.user.id,
               problem_id: currentProblem.id,
               language: language,
               passed: allPassed,
               execution_output: summary
             }]);
           }
         } finally {
           console.log = originalLog;
         }
       } else {
         const res = await fetch(`${API_BASE}/api/interview/chat`, {
           method: "POST",
           headers: {
             "Content-Type": "application/json",
             Authorization: `Bearer ${session?.access_token || ""}`,
           },
           body: JSON.stringify({
             sessionId: activeSessionId,
             answer: `Simulate the execution of this code against 3 test cases for '${currentProblem.title}'. Output ONLY the execution results: whether each test case Passed or Failed, the Expected Output, the Actual Output, and any Compilation/Runtime Errors. Do not provide any hints or feedback on how to improve the code.`,
             codeContext: `Language: ${language}\n\n${code}`
           })
         });

         const data = await res.json();
         setIsRunning(false);
         
         if (data.reply) {
           setExecutionOutput(data.reply);
           const passed = !data.reply.toLowerCase().includes('failed') && !data.reply.toLowerCase().includes('error');
           if (session?.user) {
             await supabase.from('coding_attempts').insert([{
               user_id: session.user.id,
               problem_id: currentProblem.id,
               language: language,
               passed: passed,
               execution_output: data.reply
             }]);
           }
         } else {
           throw new Error(data.error || "No reply from execution server");
         }
       }
     } catch (error: any) {
       console.error("Backend Error:", error);
       setIsRunning(false);
       setExecutionOutput(`Error: ${error.message || "Could not connect to execution server."}`);
     }
  };

  const submitCodeForReview = async () => {
     setIsThinking(true);
     setAiFeedback(null);

     try {
       const supabase = createClient();
       const { data: { session } } = await supabase.auth.getSession();

       const res = await fetch(`${API_BASE}/api/interview/chat`, {
         method: "POST",
         headers: {
           "Content-Type": "application/json",
           Authorization: `Bearer ${session?.access_token || ""}`,
         },
         body: JSON.stringify({
           sessionId: activeSessionId,
           answer: `Please review my solution for '${currentProblem.title}'. Focus specifically on time & space complexity, edge cases, correctness, and clean code improvements.`,
           codeContext: `Language: ${language}\n\n${code}`
         })
       });

       const data = await res.json();
       setIsThinking(false);
       
       if (data.reply) {
         setAiFeedback(data.reply);
       } else {
         throw new Error(data.error || "No reply from AI");
       }
     } catch (error: any) {
       console.error("Backend Error:", error);
       setIsThinking(false);
       setAiFeedback(`Error: ${error.message || "Could not connect to server."}`);
     }
  };

  return (
    <div className="h-screen bg-[#0A0F1C] text-slate-100 flex flex-col selection:bg-blue-500/30 overflow-hidden font-sans">
      
      {/* Top Header */}
      <header className="p-4 px-6 flex justify-between items-center z-10 bg-[#0A0F1C] border-b border-white/10 shadow-sm shrink-0">
        <div className="flex items-center gap-4">
           <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-1.5 rounded flex items-center justify-center shadow-lg">
             <CheckCircle2 className="w-4 h-4 text-white" />
           </div>
          <span className="font-bold text-sm tracking-wide text-white">CODING CHALLENGE</span>
        </div>
        <button 
           onClick={() => router.push(`/dashboard`)}
           className="text-sm font-medium px-6 py-2 rounded bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-slate-300"
        >
          End Challenge
        </button>
      </header>

      {/* Main Split Interface */}
      <main className="flex-grow flex flex-col md:flex-row min-h-0">
        
        {/* Left Side: Problem Description */}
        <div className="w-full md:w-[40%] border-r border-white/10 flex flex-col bg-[#0D1326] overflow-y-auto">
          <div className="p-8 space-y-6">
             <div className="flex items-center gap-3 mb-6">
                <span className={`px-3 py-1 text-xs font-bold rounded ${
                  currentProblem.difficulty === 'Easy' ? 'bg-green-500/20 text-green-400' : 
                  currentProblem.difficulty === 'Medium' ? 'bg-yellow-500/20 text-yellow-400' : 
                  'bg-red-500/20 text-red-400'
                }`}>
                  {currentProblem.difficulty}
                </span>
                <span className="text-slate-400 text-sm">{currentProblem.tags.join(", ")}</span>
             </div>
             
             <h1 className="text-2xl font-bold text-white">{currentProblem.title}</h1>
             
             <div className="text-slate-300 space-y-4 font-light leading-relaxed" dangerouslySetInnerHTML={{ __html: currentProblem.descriptionHtml }} />

             {/* AI Feedback Section */}
             {(isThinking || aiFeedback) && (
               <div className="mt-8 p-6 bg-blue-900/20 border border-blue-500/30 rounded-xl">
                 <h3 className="text-blue-400 font-bold mb-3 flex items-center gap-2">
                   <Send className="w-4 h-4" /> AI Feedback
                 </h3>
                 {isThinking ? (
                   <div className="flex items-center gap-3 text-slate-300">
                     <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                     Evaluating your code...
                   </div>
                 ) : (
                   <p className="text-slate-300 whitespace-pre-wrap font-light">{aiFeedback}</p>
                 )}
               </div>
             )}

             {/* Execution Output Section */}
             {(isRunning || executionOutput || testResults || testError) && (
               <div className="mt-4 p-6 bg-slate-900/40 border border-slate-700/50 rounded-xl space-y-4">
                 <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                   <Play className="w-4 h-4 text-emerald-400" /> Execution Results
                 </h3>
                 {isRunning ? (
                   <div className="flex items-center gap-3 text-slate-300">
                     <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                     Running test cases...
                   </div>
                 ) : testError ? (
                   <div className="text-red-400 font-mono text-sm whitespace-pre-wrap">{testError}</div>
                 ) : testResults ? (
                   <div className="space-y-4">
                     <div className="flex items-center justify-between border-b border-white/5 pb-2">
                       <span className="text-sm font-semibold text-slate-300">Test Cases Status</span>
                       <span className={`px-2 py-0.5 text-xs font-bold rounded ${
                         testResults.every(r => r.passed) ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                       }`}>
                         {testResults.filter(r => r.passed).length} / {testResults.length} Passed
                       </span>
                     </div>
                     <div className="space-y-3">
                       {testResults.map((tr) => (
                         <div key={tr.index} className="p-4 bg-black/25 rounded-lg border border-white/5 space-y-2">
                           <div className="flex items-center justify-between">
                             <span className="text-xs font-bold text-slate-400">Test Case {tr.index}</span>
                             <span className={`text-xs font-bold ${tr.passed ? 'text-green-400' : 'text-red-400'}`}>
                               {tr.passed ? 'Passed ✓' : 'Failed ✗'}
                             </span>
                           </div>
                           <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                             <div>
                               <span className="text-slate-500 block">Input</span>
                               <span className="text-slate-300 block truncate">{tr.input}</span>
                             </div>
                             <div>
                               <span className="text-slate-500 block">Expected</span>
                               <span className="text-slate-300 block truncate">{tr.expected}</span>
                             </div>
                           </div>
                           {!tr.passed && (
                             <div className="text-xs font-mono">
                               <span className="text-red-500 block font-bold">Got</span>
                               <span className="text-red-400 block whitespace-pre-wrap">{tr.actual}</span>
                             </div>
                           )}
                           {tr.logs.length > 0 && (
                             <div className="mt-2 bg-black/40 p-2 rounded text-[11px] font-mono text-slate-300 border border-white/5 max-h-24 overflow-y-auto">
                               <div className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">Stdout Logs</div>
                               {tr.logs.map((log: string, idx: number) => (
                                 <div key={idx}>{log}</div>
                               ))}
                             </div>
                           )}
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : (
                   <div className="text-slate-300 whitespace-pre-wrap font-mono text-sm">{executionOutput}</div>
                 )}
               </div>
             )}
          </div>
        </div>

        {/* Right Side: Code Editor */}
        <div className="w-full md:w-[60%] flex flex-col bg-[#1E1E1E]">
          <div className="flex items-center justify-between px-4 py-2 bg-[#2D2D2D] border-b border-black/50 shrink-0">
            <div className="flex items-center gap-3">
               <div className="relative">
                  <select 
                     value={currentProblem.id}
                     onChange={handleProblemChange}
                     className="appearance-none bg-[#1E1E1E] text-slate-300 text-sm pl-4 pr-10 py-1.5 rounded border border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-white/5 transition-colors max-w-[200px] truncate"
                  >
                     {problems.map(p => (
                       <option key={p.id} value={p.id} className="bg-[#1E1E1E] text-slate-200">{p.title}</option>
                     ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
               </div>
               <div className="relative">
                  <select 
                     value={language}
                     onChange={handleLanguageChange}
                     className="appearance-none bg-[#1E1E1E] text-slate-300 text-sm pl-4 pr-10 py-1.5 rounded border border-white/10 focus:outline-none focus:border-blue-500 cursor-pointer hover:bg-white/5 transition-colors"
                  >
                     <option value="javascript" className="bg-[#1E1E1E] text-slate-200">JavaScript</option>
                     <option value="python" className="bg-[#1E1E1E] text-slate-200">Python</option>
                     <option value="cpp" className="bg-[#1E1E1E] text-slate-200">C++</option>
                     <option value="java" className="bg-[#1E1E1E] text-slate-200">Java</option>
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
               </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={runCode}
                disabled={isRunning || isThinking}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Play className="w-4 h-4" />
                {isRunning ? "Running..." : "Run Code"}
              </button>
              <button 
                onClick={submitCodeForReview}
                disabled={isRunning || isThinking}
                className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded text-sm font-medium transition-colors disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {isThinking ? "Evaluating..." : "Submit to AI"}
              </button>
            </div>
          </div>
          <div className="flex-grow">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || "")}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                padding: { top: 16 },
                wordWrap: "on",
                scrollBeyondLastLine: false
              }}
            />
          </div>
        </div>

      </main>
    </div>
  );
}

export default function CodingRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1C] flex items-center justify-center text-white">Loading sandbox...</div>}>
      <CodingRoomContent />
    </Suspense>
  );
}
