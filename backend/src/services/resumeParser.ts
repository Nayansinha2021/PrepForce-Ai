import fs from "fs";
import path from "path";
import { GoogleGenAI } from "@google/genai";
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  return apiKey ? new GoogleGenAI({ apiKey }) : null;
};

export const parseResumeToText = async (filePath: string, originalName?: string): Promise<string> => {
  try {
    const ext = originalName ? path.extname(originalName).toLowerCase() : "";
    
    if (ext === '.docx') {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf-8');
    } else {
      // Default to PDF parsing
      try {
        const dataBuffer = fs.readFileSync(filePath);
        const data = await pdf(dataBuffer);
        if (data && data.text && data.text.trim()) {
          return data.text;
        }
      } catch (pdfErr) {
        // Fallback: try reading as UTF-8 string if pdf-parse failed
        const rawText = fs.readFileSync(filePath, 'utf-8');
        if (rawText && rawText.trim()) {
          return rawText;
        }
      }
      throw new Error("Could not extract readable text from PDF. Please ensure it is a valid PDF or DOCX file.");
    }
  } catch (error: any) {
    console.error("Parse Error:", error);
    throw new Error(error?.message || "Failed to parse file. Please ensure it is a valid PDF or DOCX.");
  }
};

export const structureResumeData = async (text: string) => {
  const genai = getGenAI();
  if (!genai) {
    console.warn("GEMINI_API_KEY not set. Returning standard structured data.");
    return {
      skills: ["Software Engineering", "Full-Stack Development", "Problem Solving"],
      experience: "Software engineering experience based on uploaded resume.",
      projects: ["Full-Stack Application Project"],
      role: "Software Developer",
    };
  }

  const prompt = `
    Analyze the following resume text and extract the candidate's core skills, experience overview, key projects, and their inferred target job title.
    Return ONLY a valid JSON object with the keys "skills" (array of strings), "experience" (string summary), "projects" (array of strings), and "role" (string). Do NOT wrap it in markdown. Do NOT add any extra text.
    
    Resume Text:
    ${text}
  `;

  const modelsToTry = ["gemini-2.5-flash", "gemini-flash-latest", "gemini-2.0-flash"];
  let retries = 2;
  while (retries >= 0) {
    for (const modelName of modelsToTry) {
      try {
        const response = await genai.models.generateContent({
          model: modelName,
          contents: prompt,
        });
        
        // Attempt to parse JSON response
        const jsonStr = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
        return JSON.parse(jsonStr);
      } catch (error: any) {
        console.warn(`Model ${modelName} in resumeParser failed (${error.status || error.message})...`);
      }
    }
    retries--;
    if (retries >= 0) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  console.warn("Gemini AI is unavailable after model retries. Falling back to default structured data.");
  return {
    skills: ["Software Engineering", "Problem Solving", "Communication"],
    experience: "Candidate has relevant experience based on the uploaded resume.",
    projects: ["Various professional projects"],
    role: "General Candidate",
  };
};
