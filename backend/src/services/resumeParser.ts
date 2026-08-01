import fs from "fs";
import path from "path";
import OpenAI from "openai";
const pdf = require("pdf-parse");
const mammoth = require("mammoth");

const getGrokAI = () => {
  const apiKey = process.env.XAI_API_KEY;
  return apiKey ? new OpenAI({ apiKey, baseURL: "https://api.x.ai/v1" }) : null;
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

const TECH_CATALOG = [
  "JavaScript", "TypeScript", "React", "Node.js", "Python", "Java", "C++", "C#", "Go", "Ruby", "PHP", 
  "Swift", "Kotlin", "HTML", "CSS", "SQL", "NoSQL", "MongoDB", "PostgreSQL", "MySQL", "Redis", 
  "Docker", "Kubernetes", "AWS", "Azure", "GCP", "GraphQL", "REST API", "Express", "Django", "Flask",
  "Spring Boot", ".NET", "Vue.js", "Angular", "Next.js", "Tailwind CSS", "Git", "Linux", "Machine Learning"
];

const ROLE_CATALOG = [
  "Software Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer",
  "Data Scientist", "DevOps Engineer", "Mobile Developer", "UI/UX Designer", "Product Manager",
  "Systems Administrator", "Cloud Architect", "Machine Learning Engineer", "Web Developer"
];

const fallbackRuleBasedParsing = (text: string) => {
  const normalizedText = text.toLowerCase();
  
  // Extract Skills
  const extractedSkills = TECH_CATALOG.filter(skill => {
    const regex = new RegExp(`\\b${skill.toLowerCase().replace('+', '\\+')}\\b`, 'i');
    return regex.test(normalizedText);
  });
  
  // Extract Role
  let inferredRole = "Software Developer";
  for (const role of ROLE_CATALOG) {
    if (normalizedText.includes(role.toLowerCase())) {
      inferredRole = role;
      break;
    }
  }

  // Basic Section Boundary Splitting for Experience & Projects
  let experienceSummary = "Candidate has relevant experience in the tech industry.";
  let extractedProjects = ["Technical Project Experience"];

  const expMatch = text.match(/(?:EXPERIENCE|WORK HISTORY|EMPLOYMENT)[\s\S]*?(?:EDUCATION|PROJECTS|SKILLS|$)/i);
  if (expMatch && expMatch[0].length > 50) {
    experienceSummary = expMatch[0].substring(0, 200).replace(/\n/g, " ").trim() + "...";
  }

  const projMatch = text.match(/(?:PROJECTS)[\s\S]*?(?:EDUCATION|EXPERIENCE|SKILLS|$)/i);
  if (projMatch && projMatch[0].length > 50) {
    // Extract a few lines that might be project titles
    const lines = projMatch[0].split('\n').filter(l => l.trim().length > 5 && l.trim().length < 60);
    if (lines.length > 1) {
      extractedProjects = lines.slice(1, 4).map(l => l.replace(/[^a-zA-Z0-9 ]/g, "").trim());
    }
  }

  return {
    skills: extractedSkills.length > 0 ? extractedSkills.slice(0, 8) : ["Software Engineering", "Problem Solving"],
    experience: experienceSummary,
    projects: extractedProjects,
    role: inferredRole,
  };
};

export const structureResumeData = async (text: string) => {
  return fallbackRuleBasedParsing(text);
};

export const extractTechStack = async (text: string): Promise<string[]> => {
  return fallbackRuleBasedParsing(text).skills;
};
