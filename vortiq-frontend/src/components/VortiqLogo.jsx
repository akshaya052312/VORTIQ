import React from "react";

const VortiqLogo = ({ size = 40, showText = true, isDark = true }) => {
  const svgSize = size;
  const fontSize = Math.max(14, size * 0.35);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* Icon Mark */}
      <svg
        width={svgSize}
        height={svgSize}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        <defs>
          <linearGradient
            id="vortiqGrad"
            x1="0"
            y1="0"
            x2="1"
            y2="1"
            gradientUnits="objectBoundingBox"
          >
            <stop offset="0%" stopColor="#C084FC" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <radialGradient id="vortiqGlow" gradientUnits="objectBoundingBox">
            <stop offset="0%" stopColor="rgba(192,132,252,0.3)" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>

        {/* Radial Glow Behind V */}
        <circle
          cx="20"
          cy="20"
          r="10"
          fill="url(#vortiqGlow)"
        />

        {/* Outer Circle - Vortex */}
        <circle
          cx="20"
          cy="20"
          r="18"
          fill="none"
          stroke="url(#vortiqGrad)"
          strokeWidth="1.5"
          opacity="0.3"
        />

        {/* Inner Circle - Vortex */}
        <circle
          cx="20"
          cy="20"
          r="12"
          fill="none"
          stroke="url(#vortiqGrad)"
          strokeWidth="1.5"
          opacity="0.15"
        />

        {/* V Shape */}
        <path
          d="M 8 12 L 20 28 L 32 12"
          fill="none"
          stroke="url(#vortiqGrad)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Left Arm - Waveform Bars */}
        {/* Bar 1 - height 4px */}
        <rect
          x="11"
          y="17"
          width="2"
          height="4"
          rx="1"
          fill="#C084FC"
          opacity="0.8"
          transform="rotate(-33.7 12 19)"
        />
        {/* Bar 2 - height 7px */}
        <rect
          x="13"
          y="16"
          width="2"
          height="7"
          rx="1"
          fill="#C084FC"
          opacity="0.8"
          transform="rotate(-33.7 14 19.5)"
        />
        {/* Bar 3 - height 5px */}
        <rect
          x="15"
          y="17"
          width="2"
          height="5"
          rx="1"
          fill="#C084FC"
          opacity="0.8"
          transform="rotate(-33.7 16 19.5)"
        />

        {/* Right Arm - Waveform Bars */}
        {/* Bar 1 - height 5px */}
        <rect
          x="25"
          y="17"
          width="2"
          height="5"
          rx="1"
          fill="#A855F7"
          opacity="0.8"
          transform="rotate(33.7 26 19.5)"
        />
        {/* Bar 2 - height 8px */}
        <rect
          x="27"
          y="15.5"
          width="2"
          height="8"
          rx="1"
          fill="#A855F7"
          opacity="0.8"
          transform="rotate(33.7 28 19.5)"
        />
        {/* Bar 3 - height 4px */}
        <rect
          x="29"
          y="17"
          width="2"
          height="4"
          rx="1"
          fill="#A855F7"
          opacity="0.8"
          transform="rotate(33.7 30 19)"
        />
      </svg>

      {/* Wordmark */}
      {showText && (
        <span
          style={{
            fontFamily: "Inter, sans-serif",
            fontWeight: 800,
            fontSize: `${fontSize}px`,
            letterSpacing: "-0.5px",
            lineHeight: 1,
            display: "flex",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#C084FC" }}>V</span>
          <span style={{ color: isDark ? "white" : "#1E1B2E" }}>ortiq</span>
        </span>
      )}
    </div>
  );
};

export default VortiqLogo;
