/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eef6ff",
          100: "#d9eaff",
          200: "#b3d5ff",
          300: "#84bbff",
          400: "#559fff",
          500: "#2e86ff",
          600: "#146df1",
          700: "#0f54be",
          800: "#0e4497",
          900: "#0e3b7d"
        }
      },
      boxShadow: {
        card: "0 1px 2px rgba(16,24,40,0.05), 0 1px 3px rgba(16,24,40,0.1)"
      },
      fontSize: {
        'xs': '0.75rem',     // 12px - for small labels
        'sm': '0.875rem',    // 14px - primary text size (matches sidebar)
        'base': '0.875rem',  // 14px - base font size (same as sm)
        'lg': '1rem',        // 16px - larger text
        'xl': '1.125rem',    // 18px - headings
        '2xl': '1.25rem',    // 20px - larger headings
      },
      fontFamily: {
        'sans': ['Lato', 'ui-sans-serif', 'system-ui'],
        'mono': ['Lato', 'ui-monospace', 'SFMono-Regular'],
      }
    },
  },
  plugins: [],
}
