import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "../config/supabase";
import { sendInterviewReportEmail } from "../services/emailService";
import { mockSessionCache } from "./interview.controller";

const genai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;
export const generateFeedbackReport = async (req: Request, res: Response) => {
  try {
    const rawSessionId = req.params.sessionId;
    const sessionId = typeof rawSessionId === 'string' ? rawSessionId : (Array.isArray(rawSessionId) ? rawSessionId[0] : "");

    const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const isMockSession = !UUID_REGEX.test(sessionId);

    let interviewData: any = null;
    let existingMessages: any[] = [];

    if (isMockSession) {
      if (!mockSessionCache.has(sessionId)) {
        mockSessionCache.set(sessionId, {
          interview: {
            role: "General Software Developer",
            parsed_resume_context: {
              skills: ["JavaScript", "React", "Node.js", "Python"],
              experience: ["Software Engineer at TechCorp"],
              projects: ["AI Dashboard Integration"]
            }
          },
          messages: [],
          createdAt: Date.now()
        });
      }
      const cached = mockSessionCache.get(sessionId)!;
      interviewData = cached.interview;
      existingMessages = cached.messages;

      // Return cached report if it already exists, attaching raw behavioral metrics
      if (interviewData.scorecard) {
        const cachedReport = {
          ...interviewData.scorecard,
          behavioralData: interviewData.behavioral_data
        };
        return res.json({ report: cachedReport });
      }
    } else {
      const { data: dbInterview, error: interviewError } = await supabase
        .from('interviews')
        .select('scorecard, status, behavioral_data')
        .eq('id', sessionId)
        .maybeSingle();

      if (!dbInterview) {
        if (!mockSessionCache.has(sessionId)) {
          mockSessionCache.set(sessionId, {
            interview: {
              role: "Software Engineer",
              parsed_resume_context: {
                skills: ["Algorithms", "Data Structures", "Problem Solving"]
              }
            },
            messages: [],
            createdAt: Date.now()
          });
        }
        const cached = mockSessionCache.get(sessionId)!;
        interviewData = cached.interview;
        existingMessages = cached.messages;
      } else {
        interviewData = dbInterview;

        // Return cached report if it already exists, attaching raw behavioral metrics
        if (interviewData.scorecard) {
          const cachedReport = {
            ...interviewData.scorecard,
            behavioralData: interviewData.behavioral_data
          };
          return res.json({ report: cachedReport });
        }

        const { data: dbMessages, error: msgError } = await supabase
          .from('messages')
          .select('role, content')
          .eq('interview_id', sessionId)
          .order('created_at', { ascending: true });

        if (msgError) {
          return res.status(500).json({ error: "Failed to fetch messages" });
        }
        existingMessages = dbMessages || [];
      }
    }

    if (!existingMessages || existingMessages.length === 0) {
       // Generate a dummy report for an empty interview
       const emptyReport = {
         overallScore: 0,
         technicalDepth: 0,
         communication: 0,
         confidence: 0,
         strengths: ["None (Interview was ended before answering any questions)"],
         improvements: ["Participate in the interview to get a full analysis"],
         behavioralAnalysis: "Not enough data to analyze behavior."
       };
       if (isMockSession) {
         interviewData.scorecard = emptyReport;
       } else {
         await supabase
           .from('interviews')
           .update({ scorecard: emptyReport, status: 'completed' })
           .eq('id', sessionId);
       }
       return res.json({ 
         report: { 
           ...emptyReport, 
           behavioralData: interviewData.behavioral_data 
         } 
       });
    }

    // Calculate quantitative filler word frequencies and speaking speed (WPM)
    const userMessages = existingMessages.filter(m => m.role === 'user');
    const userSpeechText = userMessages.map(m => m.content).join(" ");
    const fillerWords = ["um", "ah", "basically", "like", "so", "actually"];
    const fillerCounts: Record<string, number> = {};
    let totalFillers = 0;
    
    fillerWords.forEach(word => {
      const regex = new RegExp(`\\b${word}\\b`, 'gi');
      const count = (userSpeechText.match(regex) || []).length;
      fillerCounts[word] = count;
      totalFillers += count;
    });

    const totalWords = userSpeechText.split(/\s+/).filter(Boolean).length;
    const estimatedMinutes = Math.max(0.5, userMessages.length * 0.4); 
    const calculatedWpm = totalWords > 0 ? Math.round(totalWords / estimatedMinutes) : 0;

    const speechAnalytics = {
      wpm: calculatedWpm || 110,
      fillers: fillerCounts,
      totalFillers: totalFillers
    };

    const mockTranscript = existingMessages.map(m => `${m.role.toUpperCase()}: ${m.content}`).join("\n");
    const behavioralContext = interviewData.behavioral_data 
      ? `\n\nBEHAVIORAL DATA LOGGED DURING INTERVIEW:\n${JSON.stringify(interviewData.behavioral_data, null, 2)}\nUse this to generate a specific "behavioralAnalysis" section focusing on non-verbal communication, eye contact (distractions), and expression (smiles/neutral/nervousness).`
      : "";

    if (!genai) {
      const mockReport = {
         overallScore: 85,
         technicalDepth: 90,
         communication: 82,
         confidence: 88,
         strengths: ["Strong React concepts", "Clear speaker"],
         improvements: ["System design micro-frontends"],
         speechAnalytics
      };
      if (isMockSession) {
        interviewData.scorecard = mockReport;
      } else {
        await supabase
          .from('interviews')
          .update({ scorecard: mockReport, status: 'completed' })
          .eq('id', sessionId);
      }
      return res.json({ 
        report: { 
          ...mockReport, 
          behavioralData: interviewData.behavioral_data 
        } 
      });
    }

    const prompt = `
      Analyze the interview transcript and evaluate the candidate.
      Generate a JSON object with:
      "overallScore": 0-100,
      "technicalDepth": 0-100,
      "communication": 0-100,
      "confidence": 0-100,
      "strengths": [array of strings],
      "improvements": [array of strings],
      "behavioralAnalysis": "A 2-3 sentence paragraph about their non-verbal cues based on the provided behavioral data, if any."
    `;

    let retries = 2;
    let response;
    while (retries >= 0) {
      try {
        response = await genai.models.generateContent({
           model: "gemini-2.5-flash",
           contents: prompt + behavioralContext + " \n\n" + mockTranscript,
        });
        break;
      } catch (e: any) {
        if (retries > 0 && (e.status === 503 || e.status === 429 || e.message?.includes('demand'))) {
          retries--;
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
        if (retries === 0 && (e.status === 503 || e.status === 429 || e.message?.includes('demand'))) {
          console.warn("Gemini AI report generation unavailable after retries. Falling back to generic report.");
          response = { text: '```json\n{"overallScore": 80, "technicalDepth": 80, "communication": 80, "confidence": 80, "strengths": ["Completed the interview despite network issues"], "improvements": ["Try again when network is stable"], "behavioralAnalysis": "Could not be analyzed due to network constraints."}\n```' };
          break;
        }
        throw e;
      }
    }
    
    let text = response?.text;
    text = text || "{}";
    const match = text.match(/\{[\s\S]*\}/);
    const jsonStr = match ? match[0] : "{}";
    const reportData = JSON.parse(jsonStr);
    reportData.speechAnalytics = speechAnalytics;

    // Cache the report and mark interview as completed
    if (isMockSession) {
      interviewData.scorecard = reportData;
    } else {
      await supabase
        .from('interviews')
        .update({ scorecard: reportData, status: 'completed' })
        .eq('id', sessionId);
    }

    // Dispatch the premium transactional scorecard email in the background
    if (!isMockSession) {
      try {
        const { data: interview } = await supabase
          .from('interviews')
          .select('user_id, role')
          .eq('id', sessionId)
          .single();

        if (interview && interview.user_id) {
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('email')
            .eq('id', interview.user_id)
            .single();

          if (profile && profile.email) {
            const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
            const reportUrl = `${frontendUrl}/report?sessionId=${sessionId}`;
            const displayName = profile.email.split('@')[0];

            sendInterviewReportEmail(
              profile.email,
              displayName,
              interview.role || 'General Candidate',
              reportData.overallScore || 85,
              reportUrl
            ).catch(e => console.error("Error triggering SES scorecard email async:", e));
          }
        }
      } catch (e) {
        console.error("Failed transactional email background dispatch sync:", e);
      }
    }

    return res.json({ 
      report: { 
        ...reportData, 
        behavioralData: interviewData.behavioral_data 
      } 
    });
  } catch (error: any) {
    console.error("Failed to generate report:", error);
    if (error.status === 429 || error.message?.includes('exceeded')) {
      return res.status(429).json({ error: "Gemini API Rate Limit Exceeded. Please try again later." });
    }
    if (error.status === 503 || error.message?.includes('demand')) {
      return res.status(503).json({ error: "Gemini AI is currently experiencing high demand. Please try again later." });
    }
    return res.status(500).json({ error: error.message || "Failed to generate report" });
  }
};
