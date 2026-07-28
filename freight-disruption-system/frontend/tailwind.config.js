// frontend/tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Geist', 'Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      colors: {
        maritime: {
          deep: '#0B1A2E',
          navy: '#0D2847',
          blue: '#1A3A5C',
          gold: '#C8A45C',
          amber: '#D4AF37',
          surface: '#112238',
          card: '#0f172a',
        },
        freight: {
          50: '#f0f7ff',
          100: '#e0effe',
          200: '#bae0fd',
          300: '#7cc8fc',
          400: '#38b0f8',
          500: '#0e94e6',
          600: '#0276c5',
          700: '#035ea1',
          800: '#075085',
          900: '#0c436f',
        },
        status: {
          normal: '#10b981',
          atrisk: '#f59e0b',
          disrupted: '#ef4444',
          normalBg: 'rgba(16, 185, 129, 0.15)',
          atriskBg: 'rgba(245, 158, 11, 0.15)',
          disruptedBg: 'rgba(239, 68, 68, 0.15)',
        },
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      boxShadow: {
        glass: '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
        'glass-sm': '0 4px 16px 0 rgba(0, 0, 0, 0.25)',
        glow: '0 0 20px rgba(200, 164, 92, 0.3)',
        'glow-red': '0 0 20px rgba(239, 68, 68, 0.4)',
        'glow-green': '0 0 20px rgba(16, 185, 129, 0.4)',
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        wave: {
          '0%, 100%': { transform: 'translateX(0) translateY(0)' },
          '50%': { transform: 'translateX(-25%) translateY(-10px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' },
        },
        sail: {
          '0%': { transform: 'translateX(-100%) translateY(0)' },
          '25%': { transform: 'translateX(25vw) translateY(-8px)' },
          '50%': { transform: 'translateX(50vw) translateY(-4px)' },
          '75%': { transform: 'translateX(75vw) translateY(-12px)' },
          '100%': { transform: 'translateX(100vw) translateY(-6px)' },
        },
        fly: {
          '0%': { transform: 'translateX(-100%) translateY(20%)' },
          '100%': { transform: 'translateX(100vw) translateY(10%)' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '0.4', transform: 'scale(1)' },
          '50%': { opacity: '0.9', transform: 'scale(1.08)' },
        },
        radarSweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        wave: "wave 20s ease-in-out infinite",
        float: "float 3s ease-in-out infinite",
        sail: "sail 45s linear infinite",
        fly: "fly 30s linear infinite",
        'pulse-glow': "pulseGlow 2.5s ease-in-out infinite",
        'radar': "radarSweep 8s linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}