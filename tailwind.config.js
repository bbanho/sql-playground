/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  // The app renders from the flat source tree (no src/ directory).
  content: [
    './index.html',
    './App.tsx',
    './index.tsx',
    './components/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'Monaco', 'Consolas', 'Liberation Mono', 'Courier New', 'monospace'],
        sans: ['Inter', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'Arial', 'sans-serif'],
      },
      colors: {
        ice: {
          50: '#f8fafc',
          100: '#f0f4f8', // Surface (Light Mode)
          200: '#dde6ee', // Canvas (Light Mode)
          300: '#c5d1de', // Borders
          800: '#334155', // Text
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};
