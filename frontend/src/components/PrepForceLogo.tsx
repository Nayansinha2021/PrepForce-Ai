import React from "react";

interface PrepForceLogoProps {
  className?: string;
  width?: number | string;
  height?: number | string;
}

export default function PrepForceLogo({ className = "w-[150px] h-[30px]", width, height }: PrepForceLogoProps) {
  return (
    <svg 
      viewBox="0 0 250 75" 
      className={`overflow-visible ${className}`} 
      width={width} 
      height={height}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Top horizontal stroke and tapered diagonal return wing */}
      <path 
        d="M 6 15 H 175 L 181 18 L 90 67 L 98 60 L 157 21 H 6 Z" 
        fill="#F8FAFC"
      />

      {/* Official PrepForce Typography Mask Outline (cuts background arrow clean) */}
      <text 
        x="6" 
        y="54" 
        fill="none"
        stroke="#0A0F1C"
        strokeWidth="7"
        strokeLinejoin="round"
        fontFamily="'Arial Black', 'Impact', sans-serif" 
        fontSize="30" 
        fontWeight="900" 
        fontStyle="italic" 
        letterSpacing="-0.045em"
      >
        PREPFORCE
      </text>

      {/* Official PrepForce Typography Foreground White Text */}
      <text 
        x="6" 
        y="54" 
        fill="#F8FAFC" 
        fontFamily="'Arial Black', 'Impact', sans-serif" 
        fontSize="30" 
        fontWeight="900" 
        fontStyle="italic" 
        letterSpacing="-0.045em"
      >
        PREPFORCE
      </text>
    </svg>
  );
}
