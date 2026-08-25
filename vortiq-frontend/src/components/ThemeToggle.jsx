import { useTheme } from "../context/ThemeContext";

export const ThemeToggle = () => {
  const { isDarkMode, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      style={{
        background: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
        border: isDarkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)",
        borderRadius: "8px",
        padding: "6px 12px",
        color: isDarkMode ? "#F9FAFB" : "#111111",
        cursor: "pointer",
        fontSize: "12px",
        fontWeight: "600",
        transition: "all 0.2s ease",
      }}
      title="Toggle theme"
    >
      {isDarkMode ? "☀️" : "🌙"}
    </button>
  );
};
