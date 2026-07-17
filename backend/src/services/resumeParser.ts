import fs from "fs";
const pdf = require("pdf-parse");
const mammoth = require("mammoth");
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const genai = process.env.GEMINI_API_KEY ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY }) : null;

export const parseResumeToText = async (filePath: string, originalName?: string): Promise<string> => {
  try {
    const isDocx = originalName && originalName.toLowerCase().endsWith('.docx');
    
    if (isDocx) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else {
      // Default to PDF parsing
      const dataBuffer = fs.readFileSync(filePath);
      const data = await pdf(dataBuffer);
      return data.text;
    }
  } catch (error) {
    console.error("Parse Error:", error);
    throw new Error("Failed to parse file. Please ensure it is a valid PDF or DOCX.");
  }
};

export const structureResumeData = async (text: string) => {
  if (!genai) {
    console.warn("GEMINI_API_KEY not set. Falling back to mock structured data.");
    return {
      skills: ["Mock Skill", "React"],
      experience: "5 years mock experience",
      projects: ["Mock Project"],
      role: "Frontend React Developer",
    };
  }

  const prompt = `
    Analyze the following resume text and extract the candidate's core skills, experience overview, key projects, and their inferred target job title.
    Return ONLY a valid JSON object with the keys "skills" (array of strings), "experience" (string summary), "projects" (array of strings), and "role" (string). Do NOT wrap it in markdown. Do NOT add any extra text.
    
    Resume Text:
    ${text}
  `;

  let retries = 2;
  while (retries >= 0) {
    try {
      const response = await genai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
      });
      
      // Attempt to parse JSON response
      const jsonStr = response.text?.replace(/```json/g, "").replace(/```/g, "").trim() || "{}";
      return JSON.parse(jsonStr);
    } catch (error: any) {
      console.error(`Error structuring resume data (retries left: ${retries}):`, error.message);
      if (retries > 0 && (error.status === 503 || error.status === 429 || error.message?.includes('demand'))) {
        retries--;
        await new Promise(resolve => setTimeout(resolve, 2000)); // wait 2 seconds before retry
        continue;
      }
      if (retries === 0 && (error.status === 503 || error.status === 429 || error.message?.includes('demand'))) {
        console.warn("Gemini AI is unavailable after retries. Falling back to generic structured data.");
        return {
          skills: ["Software Engineering", "Problem Solving", "Communication"],
          experience: "Candidate has relevant experience based on the uploaded resume.",
          projects: ["Various professional projects"],
          role: "General Candidate",
        };
      }
      if (error.status === 429 || error.message?.includes('exceeded')) {
        throw new Error("Gemini API Rate Limit Exceeded. Please wait 1 minute and try again.");
      }
      if (error.status === 503 || error.message?.includes('demand')) {
        throw new Error("Gemini AI is currently experiencing high demand. Please try again in a few moments.");
      }
      throw new Error("Failed to process resume with AI");
    }
  }

  // Safety fallback — should never be reached, but prevents undefined return
  return {
    skills: ["Software Engineering", "Problem Solving", "Communication"],
    experience: "Candidate has relevant experience based on the uploaded resume.",
    projects: ["Various professional projects"],
    role: "General Candidate",
  };
};
