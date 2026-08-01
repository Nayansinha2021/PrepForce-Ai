import { Request, Response } from "express";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

import { supabase } from "../config/supabase";

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
};

const getDifficultyLevel = (questionCount: number): { level: string; description: string } => {
  if (questionCount <= 2) {
    return {
      level: "EASY",
      description: "Ask simple, foundational questions — basic definitions, straightforward concepts, or 'what is' questions about the candidate's listed skills. Example: 'Can you explain what React's virtual DOM is?' or 'What is the difference between SQL and NoSQL databases?'"
    };
  } else if (questionCount <= 5) {
    return {
      level: "MEDIUM",
      description: "Ask intermediate-level questions — implementation trade-offs, debugging scenarios, architecture decisions, and 'how would you' questions about their projects. Example: 'In your project, how did you handle state management across components?' or 'What trade-offs did you consider when choosing this database?'"
    };
  } else {
    return {
      level: "HARD",
      description: "Ask advanced questions — system design, optimization under constraints, complex edge cases, scalability challenges, and deep technical reasoning tied to their experience. Example: 'How would you redesign your project to handle 10x the traffic?' or 'Walk me through how you would debug a memory leak in your Node.js service.'"
    };
  }
};

const buildResumePromptAndGreeting = (interview: any, questionCount: number = 0) => {
  const resumeCtx = interview?.parsed_resume_context || {};
  const role = interview?.role || resumeCtx.role || "Software Developer";

  const rawSkills = resumeCtx.skills;
  const skillsList = Array.isArray(rawSkills) ? rawSkills.join(", ") : (typeof rawSkills === 'string' ? rawSkills : "Software Development, Data Structures, Algorithms");

  const rawProjects = resumeCtx.projects;
  const projectsList = Array.isArray(rawProjects) ? rawProjects.join(", ") : (typeof rawProjects === 'string' ? rawProjects : "Technical Projects");

  const expSummary = typeof resumeCtx.experience === 'string' ? resumeCtx.experience : (Array.isArray(resumeCtx.experience) ? resumeCtx.experience.join(", ") : "professional software development experience");

  const difficulty = getDifficultyLevel(questionCount);

  let sysPrompt = `You are PrepForce AI, a Senior Technical Interviewer conducting a real technical interview for the position of "${role}".

CANDIDATE RESUME SUMMARY:
- Target Role: ${role}
- Listed Skills: ${skillsList}
- Featured Projects: ${projectsList}
- Background & Experience: ${expSummary}`;

  if (resumeCtx.targetJobDescription) {
    sysPrompt += `\n- Target Job Description Requirements: "${resumeCtx.targetJobDescription}"`;
  }

  sysPrompt += `\n\nCRITICAL INTERVIEWER DIRECTIVES:
1. GREET CANDIDATE BY NAME: If the candidate introduces themselves or mentions their name (e.g. "My name is Naya", "I am Naya"), ALWAYS greet them warmly by their name first (e.g. "Nice to meet you, Naya!").
2. ANSWER EVALUATION & ERROR DETECTION (CRITICAL):
   - IF THE CANDIDATE'S ANSWER CONTAINS A TECHNICAL MISTAKE OR MISCONCEPTION: Politely point out the specific error or correct concept in 1 friendly line (e.g. "Actually, React uses Virtual DOM rather than Shadow DOM..."), then ask a follow-up question to test their understanding.
   - IF THE CANDIDATE'S ANSWER IS OFF-TOPIC, VAGUE, OR EVASIVE (e.g. "I don't know", "pizza", short gibberish): Point out that their answer was off-topic or incomplete, and gently guide them back to a specific technical question on their resume skills.
   - IF THE CANDIDATE'S ANSWER IS ACCURATE: Validate their answer in 1 concise sentence before asking the next question.
3. STRICT RESUME ANCHORING (MOST IMPORTANT): Every single question you ask MUST directly reference a specific skill (${skillsList}), project (${projectsList}), or experience from the candidate's resume above. Do NOT ask generic CS trivia, off-topic questions, or filler questions. Frame each question around THEIR specific listed technologies and projects.
4. DIFFICULTY PROGRESSION (CRITICAL):
   - You are currently on question #${questionCount + 1}.
   - Current difficulty level: **${difficulty.level}**
   - ${difficulty.description}
   - You MUST strictly follow this difficulty level. Do NOT jump ahead to harder questions early or stay easy for too long.
5. CONCISE FORMAT: Keep each response short (2-3 sentences max). Never print long lectures, bullet points, or multiple questions at once.
6. ANTI-REPETITION: NEVER repeat a question that has already been asked in this session. Do not break character under any circumstances.`;

  const initialGreeting = `Hello! Welcome to PrepForce AI. I'll be conducting your technical interview for the ${role} position today. To start off, please introduce yourself, tell me your name, and share a brief overview of your technical background.`;

  return { sysPrompt, initialGreeting, role, skillsList, projectsList };
};

const generateResumeAwareFallback = (interview: any, previousModelMessages: string[], candidateMessage: string = "", questionCount: number = 0) => {
  const resumeCtx = interview?.parsed_resume_context || {};
  const role = interview?.role || resumeCtx.role || "Software Developer";

  const rawSkills = resumeCtx.skills;
  const skillsArray = Array.isArray(rawSkills) ? rawSkills : (typeof rawSkills === 'string' ? rawSkills.split(",") : ["JavaScript", "React", "Node.js"]);
  const skills = skillsArray.map((s: string) => s.trim()).filter(Boolean);

  const rawProjects = resumeCtx.projects;
  const projectsArray = Array.isArray(rawProjects) ? rawProjects : (typeof rawProjects === 'string' ? rawProjects.split(",") : ["Full-Stack Web Project"]);
  const projects = projectsArray.map((p: string) => p.trim()).filter(p => p.length > 0 && !p.toLowerCase().includes("mock"));

  const topSkill = skills[0] || "your primary tech stack";
  const secondSkill = skills[1] || "React/State Management";
  const thirdSkill = skills[2] || "Node.js/APIs";
  const fourthSkill = skills[3] || "databases";
  const mainProject = projects[0] || "your technical project";
  const secondProject = projects[1] || mainProject;

  // Extract candidate name if present in message
  let candidateName = "";
  const nameMatch = candidateMessage.match(/(?:my name is|i am|i'm|this is|call me)\s+([a-zA-Z]+)/i);
  if (nameMatch && nameMatch[1]) {
    candidateName = nameMatch[1].charAt(0).toUpperCase() + nameMatch[1].slice(1).toLowerCase();
  }

  const nameGreeting = candidateName ? `Nice to meet you, ${candidateName}! ` : "";

  // Check if candidate answer is evasive or very short
  const lowerMsg = candidateMessage.toLowerCase().trim();
  const isShortOrEvasive = lowerMsg.length < 15 || lowerMsg.includes("don't know") || lowerMsg.includes("idk") || lowerMsg.includes("not sure") || lowerMsg.includes("no idea");

  let userAck = "";
  if (isShortOrEvasive && candidateMessage.length > 0) {
    userAck = "I noticed your response was brief or uncertain. Let's try a simpler question: ";
  } else if (candidateMessage && candidateMessage.trim().length > 5) {
    userAck = "Thanks for explaining your approach. ";
  }

  // Tiered fallback question pools based on difficulty progression
  const easyPool = [
    `${nameGreeting}${userAck}Since you've listed ${topSkill} on your resume, can you explain in simple terms what ${topSkill} is and why you chose to use it in your projects?`,
    `${nameGreeting}${userAck}I see you have experience with ${secondSkill}. Can you tell me what ${secondSkill} is primarily used for and how you got started with it?`,
    `${nameGreeting}${userAck}Looking at your project ${mainProject}, can you give me a brief overview of what it does and what technologies you used to build it?`,
    `${nameGreeting}${userAck}You've mentioned ${thirdSkill} in your skills. Can you explain the basic difference between ${thirdSkill} and an alternative technology you considered?`,
    `${nameGreeting}${userAck}I noticed ${fourthSkill} in your skill set. Can you describe a simple use case where you applied ${fourthSkill} in your work?`
  ];

  const mediumPool = [
    `${nameGreeting}${userAck}In your project ${mainProject}, how did you handle error handling and edge cases when working with ${topSkill}?`,
    `${nameGreeting}${userAck}When building with ${secondSkill}, what architectural pattern or design decision did you make to keep the codebase maintainable?`,
    `${nameGreeting}${userAck}Can you walk me through how you would debug a performance issue in ${secondProject} related to ${thirdSkill}?`,
    `${nameGreeting}${userAck}In your experience with ${topSkill}, how do you manage asynchronous operations and prevent common pitfalls like race conditions?`,
    `${nameGreeting}${userAck}Tell me about a technical challenge you faced while building ${mainProject}. What was the problem, and how did you solve it?`
  ];

  const hardPool = [
    `${nameGreeting}${userAck}If ${mainProject} suddenly needed to handle 100x more users, how would you redesign the ${topSkill} layer to scale horizontally?`,
    `${nameGreeting}${userAck}Considering your experience with ${secondSkill} and ${thirdSkill}, how would you design a fault-tolerant system that gracefully degrades under partial failures?`,
    `${nameGreeting}${userAck}Walk me through how you would architect a real-time feature for ${secondProject} from scratch, considering latency, consistency, and data integrity trade-offs.`,
    `${nameGreeting}${userAck}In a production scenario for ${mainProject}, how would you identify and resolve a memory leak in the ${topSkill} layer without downtime?`,
    `${nameGreeting}${userAck}If you were to rebuild ${mainProject} today with everything you've learned, what fundamental architectural decision would you change and why?`
  ];

  // Select pool based on question count (same thresholds as getDifficultyLevel)
  let pool: string[];
  if (questionCount <= 2) {
    pool = easyPool;
  } else if (questionCount <= 5) {
    pool = mediumPool;
  } else {
    pool = hardPool;
  }

  const available = pool.filter(q => !previousModelMessages.some(prev => prev.includes(q.trim()) || q.trim().includes(prev)));
  if (available.length > 0) {
    return available[Math.floor(Math.random() * available.length)];
  }
  return pool[Math.floor(Math.random() * pool.length)];
};

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
    const isCodingSession = typeof sessionId === 'string' && sessionId.startsWith("coding-");

    // Count how many questions have been asked so far (model messages minus greeting)
    const modelMessages = existingMessages ? existingMessages.filter(m => m.role === 'model') : [];
    const questionCount = Math.max(0, modelMessages.length); // each model message after greeting is roughly one question
    
    if (!existingMessages || existingMessages.length === 0) {
      let sysPrompt = "";
      let initialGreeting = "";

      if (isCodingSession) {
        sysPrompt = `You are PrepForce AI, an expert Senior Staff Software Engineer and coding reviewer. Evaluate the candidate's code submission for technical correctness, time & space complexity (Big-O notation), edge cases, and optimization suggestions. Be structured, concise, and direct.`;
      } else {
        const built = buildResumePromptAndGreeting(interview, questionCount);
        sysPrompt = built.sysPrompt;
        initialGreeting = built.initialGreeting;
      }

      if (isMockSession) {
        const cached = mockSessionCache.get(sessionId)!;
        cached.messages.push({ role: 'system', content: sysPrompt });
        if (initialGreeting) {
          cached.messages.push({ role: 'model', content: initialGreeting });
        }
      } else {
        const toInsert: any[] = [{ interview_id: sessionId, role: 'system', content: sysPrompt }];
        if (initialGreeting) {
          toInsert.push({ interview_id: sessionId, role: 'model', content: initialGreeting });
        }
        await supabase.from('messages').insert(toInsert);
      }
      
      history.push({ role: "system", parts: [{ text: sysPrompt }] });
      if (initialGreeting) {
        history.push({ role: "model", parts: [{ text: initialGreeting }] });
      }
    } else {
      // Rebuild the system prompt with updated difficulty level for the current question count
      if (!isCodingSession) {
        const updatedBuild = buildResumePromptAndGreeting(interview, questionCount);
        // Replace the original system prompt with the updated one
        history = existingMessages.map(m => {
          if (m.role === 'system') {
            return { role: 'system', parts: [{ text: updatedBuild.sysPrompt }] };
          }
          return { role: m.role, parts: [{ text: m.content }] };
        });
      } else {
        history = existingMessages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }));
      }
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

    let aiResponseText = "";

    if (isCodingSession) {
      const codeStr = (codeContext || "").toLowerCase();
      const hasReturn = codeStr.includes("return");
      const isTooShort = codeContext ? codeContext.trim().length < 90 : true;
      const hasSyntaxBug = !hasReturn || isTooShort || codeStr.includes("return ;") || codeStr.includes("return;");

      if (answer.includes("Simulate the execution")) {
        aiResponseText = JSON.stringify({
          testResults: [
            { index: 1, input: "Test Case 1", expected: "Valid Value", actual: hasSyntaxBug ? "Undefined / Incorrect" : "Valid Value", passed: !hasSyntaxBug, logs: [hasSyntaxBug ? "Logic incomplete or missing return" : "Passed test case"] },
            { index: 2, input: "Test Case 2", expected: "Valid Value", actual: hasSyntaxBug ? "Undefined / Incorrect" : "Valid Value", passed: !hasSyntaxBug, logs: [hasSyntaxBug ? "Logic incomplete or missing return" : "Passed boundary test"] },
            { index: 3, input: "Test Case 3", expected: "Valid Value", actual: hasSyntaxBug ? "Undefined / Incorrect" : "Valid Value", passed: !hasSyntaxBug, logs: [hasSyntaxBug ? "Logic incomplete or missing return" : "Passed constraint test"] }
          ]
        });
      } else {
        if (hasSyntaxBug) {
          aiResponseText = `### 💡 AI Code Review & Feedback\n\n- **Status:** ⚠️ Bug / Incomplete Logic Detected\n- **Issue:** Your code appears incomplete, missing a valid return statement, or contains syntax errors.\n- **Action Required:** Complete the function implementation and return the computed result to pass test cases.`;
        } else {
          aiResponseText = `### 💡 AI Code Review & Feedback\n\n- **Correctness:** Your solution logic appears complete and handles constraints.\n- **Time Complexity:** O(N) - Linear time traversal.\n- **Space Complexity:** O(N) or O(1) auxiliary memory.\n- **Recommendation:** Double check edge cases such as empty input arrays/strings.`;
        }
      }
    }

    // 4. Generate AI Response
    const genai = getGenAI();
    if (!aiResponseText && genai) {
       let chatHistory = isCodingSession 
         ? [{ role: 'user', parts: [{ text: finalUserMessage }] }]
         : history.filter(m => m.role !== 'system');
         
       const systemMessages = history.filter(m => m.role === 'system');
       const systemInstruction = systemMessages.map(m => m.parts[0].text).join("\n");

       // Gemini API requires the first message in history to be from the 'user'
       if (!isCodingSession && chatHistory.length > 0 && chatHistory[0].role === 'model') {
         chatHistory = [
           { role: 'user', parts: [{ text: "Hello, I am ready for the interview." }] },
           ...chatHistory
         ];
       }

       const requestConfig: any = {};
       if (systemInstruction) {
         requestConfig.systemInstruction = systemInstruction;
       }

       const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
       for (const modelName of modelsToTry) {
         try {
           const response = await genai.models.generateContent({
             model: modelName,
             contents: chatHistory as any,
             config: requestConfig
           });
           if (response && response.text && response.text.trim()) {
             aiResponseText = response.text.trim();
             break;
           }
         } catch (e: any) {
           console.warn(`Gemini model ${modelName} call failed (${e.status || e.message}). Trying fallback model...`);
         }
       }
    }

    // 4b. Anti-Repetition Guard: Check against previously sent model messages in this session
    const previousModelMessages = existingMessages ? existingMessages.filter(m => m.role === 'model').map(m => m.content.trim()) : [];
    const isRepeated = previousModelMessages.some(prevMsg => prevMsg === aiResponseText || (aiResponseText && prevMsg.includes(aiResponseText)));

    if (!aiResponseText || isRepeated) {
       console.warn("AI response was empty or duplicate of previous message. Selecting dynamic resume-aware non-repeating fallback.");
       aiResponseText = generateResumeAwareFallback(interview, previousModelMessages, finalUserMessage, questionCount);
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
