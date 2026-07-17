"use client";

import { motion } from "framer-motion";
import { Mic, MicOff, Volume2, PhoneOff, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef, Suspense, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { useSearchParams, useRouter } from "next/navigation";
import AIOrb, { AIOrbState } from "@/components/AIOrb";
import { loadFaceModels, detectFace } from "@/lib/faceTracking";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

function InterviewRoomContent() {
  const [isListening, setIsListening] = useState(false);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("sessionId");
  const [transcript, setTranscript] = useState("");
  const [aiResponse, setAiResponse] = useState("Hello! I'm PrepForce AI. I'll be conducting your technical interview today.");
  const [isAiSpeaking, setIsAiSpeaking] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(420); // 7 minutes in seconds
  const [userAmplitude, setUserAmplitude] = useState(0);
  const isEndingRef = useRef(false);
  const router = useRouter();

  const recognitionRef = useRef<any>(null);
  const transcriptRef = useRef<string>("");
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const [tabViolations, setTabViolations] = useState(0);
  const tabViolationsRef = useRef(0);
  const [showViolationWarning, setShowViolationWarning] = useState(false);

  // Behavioral tracking
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackingIntervalRef = useRef<any>(null);
  const metricsRef = useRef({
    totalFrames: 0,
    neutralFrames: 0,
    smileFrames: 0,
    distractedFrames: 0,
  });

  // Initialize camera and models
  useEffect(() => {
    let isMounted = true;

    const initTracking = async () => {
      await loadFaceModels();
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // If unmounted while userMedia was loading, stop the tracks immediately and release camera hardware!
        if (!isMounted) {
          stream.getTracks().forEach(track => track.stop());
          return;
        }

        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        
        // Setup Audio Analyzer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 256;
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        audioContextRef.current = audioContext;
        analyserRef.current = analyser;
        
        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateAmplitude = () => {
          if (!isMounted) return;
          analyser.getByteFrequencyData(dataArray);
          let sum = 0;
          for(let i=0; i<dataArray.length; i++) { sum += dataArray[i]; }
          const avg = sum / dataArray.length;
          setUserAmplitude(avg / 128); // Normalize 0 to ~1
          animationFrameRef.current = requestAnimationFrame(updateAmplitude);
        };
        updateAmplitude();
        
      } catch (err) {
        console.warn("Could not access webcam/mic for tracking:", err);
      }
    };
    initTracking();

    trackingIntervalRef.current = setInterval(async () => {
      if (!isMounted) return;
      if (videoRef.current && videoRef.current.readyState === 4) {
        const detection = await detectFace(videoRef.current);
        if (detection) {
          metricsRef.current.totalFrames++;
          const expressions = detection.expressions;
          const maxExpression = Object.keys(expressions).reduce((a, b) => expressions[a as keyof typeof expressions] > expressions[b as keyof typeof expressions] ? a : b);
          
          if (maxExpression === 'happy') metricsRef.current.smileFrames++;
          else if (maxExpression === 'neutral') metricsRef.current.neutralFrames++;
          
          if (detection.detection.score < 0.7) {
            metricsRef.current.distractedFrames++;
          }
        } else {
          metricsRef.current.totalFrames++;
          metricsRef.current.distractedFrames++;
        }
      }
    }, 2000); // Sample every 2 seconds

    return () => {
      isMounted = false;
      if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(e => console.warn("AudioContext close warning:", e));
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }
    };
  }, []);

  const endInterviewAndReport = useCallback(async () => {
    if (isEndingRef.current) return;
    isEndingRef.current = true;
    window.speechSynthesis.cancel();
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch(e) {}
    }
    
    // Stop camera and mic explicitly
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(e => console.warn("AudioContext close warning:", e));
    }
    
    // Save behavioral data before redirecting
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(`${API_BASE}/api/interview/behavior`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
        body: JSON.stringify({
          sessionId,
          metrics: {
            ...metricsRef.current,
            tabViolations: tabViolationsRef.current
          }
        })
      });
    } catch(e) {
      console.error("Failed to save behavioral data", e);
    }

    router.push(`/report?sessionId=${sessionId}`);
  }, [sessionId, router]);

  useEffect(() => {
    if (tabViolations >= 3) {
      // End interview automatically
      endInterviewAndReport();
    } else if (tabViolations > 0) {
      setShowViolationWarning(true);
    }
  }, [tabViolations, router, sessionId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        tabViolationsRef.current += 1;
        setTabViolations(tabViolationsRef.current);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (timeLeft <= 0) {
      endInterviewAndReport();
      return;
    }
    const timerId = setTimeout(() => setTimeLeft(prev => prev - 1), 1000);
    return () => clearTimeout(timerId);
  }, [timeLeft, endInterviewAndReport]);

  useEffect(() => {
    // Initialize Web Speech API
    if (typeof window !== "undefined" && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;

      recognitionRef.current.onresult = (event: any) => {
        let fullTranscript = '';
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
        transcriptRef.current = fullTranscript;
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
        // Automatically send the chunk to backend when user stops speaking
        if (transcriptRef.current.length > 5) {
          handleUserFinishedSpeaking(transcriptRef.current);
          transcriptRef.current = ""; // Reset ref after sending
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []); // Empty dependency array to prevent infinite loops

  const speakAiResponse = (text: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel(); // Stop any current speech
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Optionally find a decent voice
      const voices = window.speechSynthesis.getVoices();
      const preferredVoice = voices.find(v => v.name.includes("Google US English") || v.lang.includes("en-US"));
      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsAiSpeaking(true);
      utterance.onend = () => setIsAiSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleUserFinishedSpeaking = async (finalTranscript: string) => {
     setTranscript(""); // Clear UI
     setIsThinking(true);
     setAiResponse("Thinking...");

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
           sessionId: sessionId || "mock-123",
           answer: finalTranscript
         })
       });

       const data = await res.json();
       setIsThinking(false);
       
       if (data.reply) {
         setAiResponse(data.reply);
         speakAiResponse(data.reply);
       } else {
         throw new Error(data.error || "No reply from AI");
       }
     } catch (error: any) {
       console.error("Backend Error:", error);
       setIsThinking(false);
       const errorMsg = error.message || "I'm sorry, I'm having trouble connecting to my server.";
       setAiResponse(`Error: ${errorMsg}`);
       speakAiResponse("I'm sorry, an error occurred while processing your response.");
     }
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      setTranscript("");
      try {
        recognitionRef.current?.start();
      } catch (e) {
        console.warn("Speech recognition already started:", e);
      }
      setIsListening(true);
      window.speechSynthesis.cancel(); // Stop AI if speaking
      setIsAiSpeaking(false);
    }
  };

  let orbState: AIOrbState = "idle";
  if (isThinking) orbState = "thinking";
  else if (isAiSpeaking) orbState = "speaking";
  else if (isListening) orbState = "listening";

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="h-screen bg-[#0A0F1C] text-slate-100 flex flex-col selection:bg-blue-500/30 overflow-hidden font-sans">
      
      {showViolationWarning && (
        <div className="fixed inset-0 z-50 bg-[#0A0F1C]/90 backdrop-blur-md flex items-center justify-center p-6">
          <div className="bg-white/5 border border-white/10 p-8 rounded-3xl max-w-md w-full text-center shadow-2xl backdrop-blur-xl">
            <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Tab Switch Detected</h2>
            <p className="text-slate-400 mb-6 font-light">
              Please remain on this tab during your interview. Leaving the tab again may result in automatic termination of the interview. ({tabViolations}/3 warnings)
            </p>
            <button
              onClick={() => setShowViolationWarning(false)}
              className="bg-red-600/20 border border-red-500/50 hover:bg-red-600/40 text-red-400 px-8 py-3 rounded-full font-medium transition-colors w-full shadow-lg"
            >
              I Understand, Continue
            </button>
          </div>
        </div>
      )}

      {/* PIP Video */}
      <div className="fixed bottom-32 right-8 w-48 aspect-video bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl border border-slate-700/50 z-50">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover transform scale-x-[-1]" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-2 py-1 rounded text-[10px] font-medium text-white">
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          Face Tracking Active
        </div>
      </div>

      {/* Top Header */}
      <header className="p-6 flex justify-between items-center z-10 bg-[#0A0F1C]/80 backdrop-blur-xl border-b border-white/10 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.8)]" />
          <span className="font-mono text-sm tracking-widest text-slate-400">RECORDING</span>
        </div>
        <div className="font-bold text-lg text-white">AI Mock Interview</div>
        <div className={`text-sm font-medium px-4 py-1.5 rounded-full bg-white/5 border border-white/10 ${timeLeft < 60 ? 'text-red-400 animate-pulse' : 'text-slate-300'}`}>
          {formatTime(timeLeft)}
        </div>
      </header>

      {/* Main Interactive Stage */}
      <main className="flex-grow flex flex-col items-center justify-center p-4 relative min-h-0 overflow-y-auto overflow-x-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />
        
        {/* Core AI Orb */}
        <AIOrb state={orbState} externalAmplitude={isListening ? 1 + userAmplitude * 0.5 : undefined} className="mb-12 relative z-10" />

        {/* Captions / Transcript Area */}
        <div className="w-full max-w-2xl text-center space-y-8 relative z-10">
           <div className={`transition-opacity duration-300 ${isAiSpeaking ? 'opacity-100' : 'opacity-40'}`}>
              <h2 className="text-sm font-semibold tracking-wider text-blue-400 mb-2 uppercase">PrepForce AI</h2>
              <p className="text-lg md:text-xl font-medium leading-relaxed text-white max-h-40 overflow-y-auto px-4">{aiResponse}</p>
           </div>
           
           <div className={`transition-opacity duration-300 min-h-[100px] ${isListening || transcript ? 'opacity-100' : 'opacity-0'}`}>
              <h2 className="text-sm font-semibold tracking-wider text-slate-500 mb-2 uppercase">You</h2>
              <p className="text-xl text-slate-400 italic font-light">"{transcript || "Listening..."}"</p>
           </div>
        </div>
      </main>

      {/* Bottom Controls */}
      <footer className="shrink-0 p-6 flex justify-center gap-6 z-10 bg-[#0A0F1C]/80 backdrop-blur-xl border-t border-white/10 shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
        <button 
           onClick={toggleMic}
           className={`w-16 h-16 rounded-full flex items-center justify-center transition-all shadow-lg ${isListening ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]' : 'bg-white/10 border border-white/20 text-slate-300 hover:bg-white/20'}`}
        >
          {isListening ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
        </button>
        <button 
           onClick={endInterviewAndReport}
           className="w-16 h-16 rounded-full bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 text-red-400 flex items-center justify-center transition-all shadow-lg"
        >
          <PhoneOff className="w-6 h-6" />
        </button>
      </footer>

    </div>
  );
}

export default function InterviewRoom() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0F1C] text-white flex items-center justify-center">Loading session...</div>}>
      <InterviewRoomContent />
    </Suspense>
  );
}
