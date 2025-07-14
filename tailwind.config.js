/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // HerbCey Brand Colors
        herbcey: {
          light: "#a8e063", // Light green from logo
          main: "#7cb342", // Main brand green
          dark: "#4a7c59", // Dark green
          leaf: "#388e3c", // Leaf green
        },
        // Quick access
        primary: "#7cb342",
        secondary: "#4a7c59",
        // Black variations
        black: {
          50: "#f9fafb", // Very light gray
          100: "#f3f4f6", // Light gray
          200: "#e5e7eb", // Gray
          300: "#d1d5db", // Medium gray
          400: "#9ca3af", // Dark gray
          500: "#6b7280", // Darker gray
          600: "#4b5563", // Very dark gray
          700: "#374151", // Almost black
          800: "#1f2937", // Dark black
          900: "#111827", // Pure black
          DEFAULT: "#000000", // True black
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
