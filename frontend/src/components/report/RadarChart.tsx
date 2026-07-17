"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RadarChartProps {
  technicalDepth: number;
  communication: number;
  confidence: number;
  overallScore: number;
}

export default function RadarChart({
  technicalDepth = 85,
  communication = 80,
  confidence = 85,
  overallScore = 83,
}: RadarChartProps) {
  const [activeHoverIdx, setActiveHoverIdx] = useState<number | null>(null);

  // Compute 5-axis competencies (3 raw + 2 derived for elegant pentagon)
  const problemSolving = Math.round((technicalDepth + overallScore) / 2);
  const professionalPresence = Math.round((confidence + communication) / 2);

  const scores = [
    technicalDepth,
    communication,
    confidence,
    problemSolving,
    professionalPresence,
  ];

  const labels = [
    "Technical Depth",
    "Communication",
    "Confidence",
    "Problem Solving",
    "Professional Presence",
  ];

  const descs = [
    "Expertise in engineering structures, architectural paradigms, and syntax semantics.",
    "Ability to explain mechanics logically, sequence arguments clearly, and structure syntax.",
    "Poise, clear delivery cadence, and structural composure under assessment.",
    "Analytical capability to navigate coding requirements and structure logic.",
    "Visual posture, eye contact consistency, and expressive energy markers."
  ];

  // SVG coordinate configuration
  const width = 360;
  const height = 340;
  const cx = width / 2;
  const cy = height / 2 - 10; // Shift up slightly to fit tooltip/labels
  const maxR = 100;

  // Calculates coordinate on the pentagon for an axis at a specific radius
  const getCoordinates = (idx: number, radius: number) => {
    // 0 is top (-Math.PI / 2), and we rotate by 2*pi / 5 for each index
    const angle = -Math.PI / 2 + (2 * Math.PI * idx) / 5;
    const x = cx + radius * Math.cos(angle);
    const y = cy + radius * Math.sin(angle);
    return { x, y };
  };

  // 1. Pentagon Web Grid Lines (25%, 50%, 75%, 100%)
  const scaleLevels = [0.25, 0.5, 0.75, 1.0];
  const gridPolygons = scaleLevels.map((lvl) => {
    const radius = maxR * lvl;
    const pts = [0, 1, 2, 3, 4].map((i) => {
      const { x, y } = getCoordinates(i, radius);
      return `${x},${y}`;
    });
    return pts.join(" ");
  });

  // 2. Computed Candidate Competency Path
  const candidatePoints = scores.map((score, i) => {
    const radius = maxR * (score / 100);
    return getCoordinates(i, radius);
  });
  const candidatePolyString = candidatePoints.map((p) => `${p.x},${p.y}`).join(" ");

  // 3. Anchor Label Coordinate Placements
  const labelOffsets: Array<{
    textAnchor: "inherit" | "end" | "middle" | "start";
    dy: string;
    dx: string;
  }> = [
    { textAnchor: "middle", dy: "-14px", dx: "0px" },     // Top
    { textAnchor: "start", dy: "4px", dx: "12px" },       // Right-Top
    { textAnchor: "start", dy: "14px", dx: "8px" },       // Right-Bottom
    { textAnchor: "end", dy: "14px", dx: "-8px" },        // Left-Bottom
    { textAnchor: "end", dy: "4px", dx: "-12px" },        // Left-Top
  ];

  return (
    <div className="p-6 rounded-3xl bg-white/5 border border-white/10 shadow-2xl backdrop-blur-xl relative overflow-hidden flex flex-col h-full justify-between">
      <div className="absolute top-0 right-0 w-48 h-48 bg-blue-500/10 blur-[80px] pointer-events-none rounded-full" />
      
      {/* Title block */}
      <div>
        <h3 className="text-lg font-bold text-white mb-1">Competency Mapping</h3>
        <p className="text-xs text-slate-400 font-light">Interactive 5-axis performance metrics overview</p>
      </div>

      {/* SVG Canvas Area */}
      <div className="flex items-center justify-center my-4">
        <svg width={width} height={height} className="overflow-visible select-none">
          <defs>
            {/* Pentagon Area Fill Gradient */}
            <linearGradient id="radar-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#4F46E5" stopOpacity="0.4" />
            </linearGradient>
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Web grid regular pentagons */}
          {gridPolygons.map((poly, idx) => (
            <polygon
              key={idx}
              points={poly}
              fill="none"
              stroke="rgba(255, 255, 255, 0.08)"
              strokeWidth="1"
              strokeDasharray={idx === 3 ? "none" : "3,3"}
            />
          ))}

          {/* Pentagon Axis spoke lines */}
          {[0, 1, 2, 3, 4].map((i) => {
            const outerPt = getCoordinates(i, maxR);
            return (
              <line
                key={i}
                x1={cx}
                y1={cy}
                x2={outerPt.x}
                y2={outerPt.y}
                stroke="rgba(255, 255, 255, 0.08)"
                strokeWidth="1"
              />
            );
          })}

          {/* Filled Competency Polygon Area */}
          <polygon
            points={candidatePolyString}
            fill="url(#radar-grad)"
            stroke="#3B82F6"
            strokeWidth="2"
            style={{ filter: "drop-shadow(0 0 6px rgba(59, 130, 246, 0.5))" }}
          />

          {/* Outer anchor labels */}
          {[0, 1, 2, 3, 4].map((i) => {
            const outerPt = getCoordinates(i, maxR);
            const isHovered = activeHoverIdx === i;
            const config = labelOffsets[i];
            
            return (
              <g key={i}>
                <text
                  x={outerPt.x}
                  y={outerPt.y}
                  textAnchor={config.textAnchor}
                  dy={config.dy}
                  dx={config.dx}
                  onMouseEnter={() => setActiveHoverIdx(i)}
                  onMouseLeave={() => setActiveHoverIdx(null)}
                  className={`text-[11px] font-semibold tracking-wide transition-all cursor-pointer ${
                    isHovered ? "fill-blue-400 font-bold" : "fill-slate-400"
                  }`}
                >
                  {labels[i]}
                </text>
              </g>
            );
          })}

          {/* Glowing Interactive Data Nodes (Dots) */}
          {candidatePoints.map((pt, i) => {
            const isHovered = activeHoverIdx === i;
            return (
              <g key={i}>
                {isHovered && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="8"
                    className="fill-blue-500/30 stroke-none"
                    style={{ filter: "url(#glow)" }}
                  />
                )}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered ? "6" : "4"}
                  onMouseEnter={() => setActiveHoverIdx(i)}
                  onMouseLeave={() => setActiveHoverIdx(null)}
                  className={`cursor-pointer transition-all duration-200 stroke-[#0A0F1C] stroke-2 ${
                    isHovered ? "fill-indigo-400 scale-125" : "fill-blue-400"
                  }`}
                />
              </g>
            );
          })}
        </svg>
      </div>

      {/* Dynamic Glassmorphic Description Footer Tooltip */}
      <div className="min-h-[76px] px-4 py-3 bg-[#0D1326]/60 border border-white/5 rounded-2xl flex flex-col justify-center backdrop-blur-md relative z-20">
        <AnimatePresence mode="wait">
          {activeHoverIdx !== null ? (
            <motion.div
              key={activeHoverIdx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase tracking-wider font-extrabold text-blue-400">
                  {labels[activeHoverIdx]}
                </span>
                <span className="text-[11px] font-bold text-white px-2 py-0.5 bg-blue-500/20 border border-blue-500/30 rounded-full">
                  {scores[activeHoverIdx]}/100
                </span>
              </div>
              <p className="text-[11px] text-slate-300 mt-1 font-light leading-relaxed">
                {descs[activeHoverIdx]}
              </p>
            </motion.div>
          ) : (
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-[11px] text-slate-500 text-center font-light leading-normal"
            >
              Hover over labels or nodes to explore competency scoring criteria
            </motion.p>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
