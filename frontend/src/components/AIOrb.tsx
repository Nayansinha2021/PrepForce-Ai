"use client";

import { motion, Variants } from "framer-motion";
import React, { useEffect, useState } from "react";

export type AIOrbState = "idle" | "listening" | "thinking" | "speaking";

interface AIOrbProps {
  state: AIOrbState;
  className?: string;
  externalAmplitude?: number;
}

// Generate stable pseudo-random positions for particles once (deterministic for SSR hydration)
const PARTICLES = Array.from({ length: 12 }).map((_, i) => ({
  id: i,
  angle: (i * 360) / 12,
  distance: 60 + (Math.abs(Math.sin(i * 1.5)) * 40),
  size: 3 + (Math.abs(Math.cos(i * 2.3)) * 4),
  duration: 3 + (Math.abs(Math.sin(i * 3.7)) * 2),
}));

export default function AIOrb({ state, className = "", externalAmplitude }: AIOrbProps) {
  // We use a small state to track random amplitude when speaking if external isn't provided
  const [internalAmplitude, setInternalAmplitude] = useState(1);
  const amplitude = externalAmplitude !== undefined ? externalAmplitude : internalAmplitude;

  useEffect(() => {
    if (state !== "speaking") return;
    
    // Simulate audio amplitude for the speaking pulse
    const interval = setInterval(() => {
      setInternalAmplitude(1 + Math.random() * 0.2);
    }, 150);
    return () => clearInterval(interval);
  }, [state]);

  // Define animation variants for the main core
  const coreVariants: Variants = {
    idle: {
      scale: [1, 1.05, 1],
      y: [-5, 5, -5],
      boxShadow: "0px 0px 30px 10px rgba(37,99,235,0.2)",
      transition: { repeat: Infinity, duration: 4, ease: "easeInOut" }
    },
    listening: {
      scale: 1,
      y: 0,
      boxShadow: "0px 0px 40px 15px rgba(37,99,235,0.4)",
      transition: { duration: 0.5 }
    },
    thinking: {
      scale: [1, 0.98, 1],
      x: [-2, 2, -1, 1, 0],
      boxShadow: "0px 0px 20px 5px rgba(37,99,235,0.3)",
      transition: { repeat: Infinity, duration: 1.5, ease: "easeInOut" }
    },
    speaking: {
      scale: amplitude,
      y: 0,
      boxShadow: `0px 0px ${40 * amplitude}px ${20 * amplitude}px rgba(37,99,235,0.5)`,
      transition: { duration: 0.15 }
    }
  };

  return (
    <div className={`relative flex items-center justify-center w-64 h-64 ${className}`}>
      
      {/* Container for particles to handle group rotation */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={
          state === "thinking" ? { rotate: 360 } :
          state === "listening" ? { rotate: -45 } :
          { rotate: 0 }
        }
        transition={
          state === "thinking" ? { repeat: Infinity, duration: 3, ease: "linear" } :
          { duration: 1, ease: "easeInOut" }
        }
      >
        {PARTICLES.map((p) => {
          // Determine particle distance based on state
          let currentDistance = p.distance;
          if (state === "listening") currentDistance = p.distance * 0.5; // Inward
          if (state === "speaking") currentDistance = p.distance * (1 + amplitude * 0.2); // Expand
          
          return (
            <motion.div
              key={p.id}
              className="absolute rounded-full bg-blue-500/60 blur-[1px]"
              style={{
                width: p.size,
                height: p.size,
              }}
              animate={{
                x: Math.cos((p.angle * Math.PI) / 180) * currentDistance,
                y: Math.sin((p.angle * Math.PI) / 180) * currentDistance,
                opacity: state === "idle" ? [0.3, 0.8, 0.3] : state === "listening" ? 0.9 : state === "speaking" ? [0.6, 1, 0.6] : 0.7,
                scale: state === "speaking" ? [1, 1.5, 1] : state === "listening" ? 1.2 : 1
              }}
              transition={{
                x: { type: "spring", stiffness: 50, damping: 10 },
                y: { type: "spring", stiffness: 50, damping: 10 },
                opacity: { repeat: state === "listening" ? 0 : Infinity, duration: p.duration, ease: "easeInOut" },
                scale: { repeat: state === "listening" ? 0 : Infinity, duration: 0.5, ease: "easeInOut" }
              }}
            />
          );
        })}
      </motion.div>

      {/* Main Energy Core */}
      <motion.div
        variants={coreVariants}
        animate={state}
        className="relative z-10 w-24 h-24 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center overflow-hidden"
      >
        {/* Inner glow / texture */}
        <div className="absolute inset-0 bg-white/20 mix-blend-overlay rounded-full blur-[4px]" />
        
        {/* State-specific center symbol (optional, can be empty for pure orb) */}
        <motion.div
           animate={{ opacity: state === "listening" ? 1 : 0.4 }}
           className="w-10 h-10 rounded-full bg-white/10 blur-[8px]"
        />
      </motion.div>
      
      {/* Large ambient background glow */}
      <motion.div 
        animate={{
          opacity: state === "speaking" ? 0.3 * amplitude : state === "listening" ? 0.2 : 0.1,
          scale: state === "speaking" ? 1.2 * amplitude : 1
        }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-blue-500 rounded-full blur-[80px] -z-10"
      />
    </div>
  );
}
