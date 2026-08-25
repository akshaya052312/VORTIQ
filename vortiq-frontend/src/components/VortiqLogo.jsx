import React from "react";
import logoImage from "../assets/vortiq-logo.png";

/**
 * VortiqLogo
 * Props:
 *   size      (number)  – Height of the logo image in px (default 40)
 *   showText  (boolean) – Whether to show "Vortiq" wordmark beside the logo
 *   isDark    (boolean) – true = light text (for dark backgrounds),
 *                         false = dark text (for light backgrounds)
 */
const VortiqLogo = ({ size = 40, showText = true, isDark = true }) => {
  const fontSize = Math.max(14, size * 0.38);

  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "10px",
      }}
    >
      {/* New V logo image */}
      <img
        src={logoImage}
        alt="Vortiq"
        style={{
          width: `${size}px`,
          height: `${size}px`,
          objectFit: "contain",
          flexShrink: 0,
        }}
      />

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
          {/* "V" in brand pink */}
          <span style={{ color: "#E91E8C" }}>V</span>
          {/* "ortiq" adapts to background */}
          <span style={{ color: isDark ? "rgba(255,255,255,0.92)" : "#1E1B2E" }}>
            ortiq
          </span>
        </span>
      )}
    </div>
  );
};

export default VortiqLogo;

