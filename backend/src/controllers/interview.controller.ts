import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

import { supabase } from "../config/supabase";

const genai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const mockSessionCache = new Map<string, { interview: any, messages: any[], createdAt: number }>();

// TTL-based eviction: clean up mock sessions older than 30 minutes every 10 minutes
const MOCK_SESSION_TTL_MS = 30 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of mockSessionCache.entries()) {
    if (now - value.createdAt > MOCK_SESSION_TTL_MS) {
      mockSessionCache.delete(key);
    }
  }
}, 10 * 60 * 1000);

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const handleAiInterviewChat = async (req: Request, res: Response) => {
  try {
    const { sessionId, answer, codeContext } = req.body;

    if (!sessionId || !answer) {
      return res.status(400).json({ error: "Session ID and answer required" });
    }

    const isMockSession = !UUID_REGEX.test(sessionId);
    let interview: any = null;
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
      interview = cached.interview;
      existingMessages = cached.messages;
    } else {
      // 1. Fetch Interview Context
      const { data: dbInterview, error: intError } = await supabase
        .from('interviews')
        .select('parsed_resume_context, role')
        .eq('id', sessionId)
        .maybeSingle();

      if (!dbInterview) {
        if (!mockSessionCache.has(sessionId)) {
          mockSessionCache.set(sessionId, {
            interview: {
              role: "Software Engineer",
              parsed_resume_context: {
                skills: ["Algorithms", "Data Structures", "Problem Solving"],
                experience: ["Technical Coding Assessment"],
                projects: ["Coding Challenge Solution"]
              }
            },
            messages: [],
            createdAt: Date.now()
          });
        }
        const cached = mockSessionCache.get(sessionId)!;
        interview = cached.interview;
        existingMessages = cached.messages;
      } else {
        interview = dbInterview;

        // 2. Fetch existing messages
        const { data: dbMessages, error: msgError } = await supabase
          .from('messages')
          .select('role, content')
          .eq('interview_id', sessionId)
          .order('created_at', { ascending: true });

        existingMessages = dbMessages || [];
      }
    }

    let history: any[] = [];
    
    if (!existingMessages || existingMessages.length === 0) {
      // Initialize memory
      let sysPrompt = `You are PrepForce AI, an expert technical interviewer. The candidate is applying for the role of ${interview.role}. Context from their resume: ${JSON.stringify(interview.parsed_resume_context)}.`;
      
      if (interview.parsed_resume_context?.targetJobDescription) {
        sysPrompt += `\n\nCRITICAL INSTRUCTION: The candidate has provided the exact Job Description for this role: "${interview.parsed_resume_context.targetJobDescription}". You MUST evaluate their answers against this specific job description. Ask questions that test if they meet the specific requirements listed in this JD based on their resume.`;
      }
      
      sysPrompt += `\n\nKeep your responses short, conversational, and ask one clear follow-up question based on their previous answer. Do not break character.`;
      
      const initialGreeting = "Hello! I'm PrepForce AI. I'll be conducting your technical interview today. Can you start by telling me a bit about your background?";

      if (isMockSession) {
        const cached = mockSessionCache.get(sessionId)!;
        cached.messages.push({ role: 'system', content: sysPrompt });
        cached.messages.push({ role: 'model', content: initialGreeting });
      } else {
        await supabase.from('messages').insert([
          { interview_id: sessionId, role: 'system', content: sysPrompt },
          { interview_id: sessionId, role: 'model', content: initialGreeting }
        ]);
      }
      
      history.push({ role: "system", parts: [{ text: sysPrompt }] });
      history.push({ role: "model", parts: [{ text: initialGreeting }] });
    } else {
      history = existingMessages.map(m => ({
        role: m.role,
        parts: [{ text: m.content }]
      }));
    }

    // 3. Save user answer (optionally with code context)
    let finalUserMessage = answer;
    if (codeContext) {
      finalUserMessage += `\n\n[USER'S CURRENT CODE]:\n\`\`\`javascript\n${codeContext}\n\`\`\`\n\nPlease evaluate this code in your response if relevant.`;
    }

    if (isMockSession) {
      const cached = mockSessionCache.get(sessionId)!;
      cached.messages.push({ role: 'user', content: finalUserMessage });
    } else {
      await supabase.from('messages').insert([
        { interview_id: sessionId, role: 'user', content: finalUserMessage }
      ]);
    }
    history.push({ role: "user", parts: [{ text: finalUserMessage }] });

    let aiResponseText = "Mock response: That's interesting. How would you optimize that?";

    // 4. Generate AI Response
    if (genai) {
       let chatHistory = history.filter(m => m.role !== 'system');
       const systemMessages = history.filter(m => m.role === 'system');
       const systemInstruction = systemMessages.map(m => m.parts[0].text).join("\n");

       // Gemini API requires the first message in history to be from the 'user'
       if (chatHistory.length > 0 && chatHistory[0].role === 'model') {
         chatHistory = [
           { role: 'user', parts: [{ text: "Hello, I am ready for the interview." }] },
           ...chatHistory
         ];
       }

       const requestConfig: any = {};
       if (systemInstruction) {
         requestConfig.systemInstruction = systemInstruction;
       }

       let retries = 2;
       let response;
       while (retries >= 0) {
         try {
           response = await genai.models.generateContent({
             model: "gemini-2.5-flash",
             contents: chatHistory as any,
             config: requestConfig
           });
           break; // Success
         } catch (e: any) {
           if (retries > 0 && (e.status === 503 || e.status === 429 || e.message?.includes('demand'))) {
             retries--;
             await new Promise(resolve => setTimeout(resolve, 2000));
             continue;
           }
           if (retries === 0 && (e.status === 503 || e.status === 429 || e.message?.includes('demand'))) {
             console.warn("Gemini AI chat unavailable after retries. Falling back to generic response.");
             response = { text: "I'm currently experiencing some network lag on my end. Let's keep going. Can you elaborate a bit more on your previous point?" };
             break;
           }
           throw e;
         }
       }
       aiResponseText = response?.text || "I didn't quite catch that. Could you repeat?";
    } else {
       console.warn("No GEMINI_API_KEY found, returning mock conversational response.");
    }

    // 5. Save AI response
    if (isMockSession) {
      const cached = mockSessionCache.get(sessionId)!;
      cached.messages.push({ role: 'model', content: aiResponseText });
    } else {
      await supabase.from('messages').insert([
        { interview_id: sessionId, role: 'model', content: aiResponseText }
      ]);
    }

    return res.json({ 
       reply: aiResponseText,
       metrics: {
          sentiment: "Positive", // Placeholder for actual scoring
          confidence: "85%"
       }
    });

  } catch (error: any) {
    console.error("AI Chat Error:", error);
    if (error.status === 429 || error.message?.includes('exceeded')) {
      return res.status(429).json({ error: "Gemini API Rate Limit Exceeded. Please wait a minute." });
    }
    if (error.status === 503 || error.message?.includes('demand')) {
      return res.status(503).json({ error: "Gemini AI is currently experiencing high demand. Please try again in a few moments." });
    }
    return res.status(500).json({ error: error.message || "Interviewer AI encountered an error" });
  }
};
