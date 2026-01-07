/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
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
        // SkillChain Brand Colors - Use these consistently!
        brand: {
          primary: "hsl(var(--brand-primary))",
          accent: "hsl(var(--brand-accent))",
          success: "hsl(var(--brand-success))",
          warning: "hsl(var(--brand-warning))",
          error: "hsl(var(--brand-error))",
        },
        // Legacy neon colors - prefer brand colors instead
        neon: {
          blue: "#3B82F6",
          cyan: "#06B6D4",
          orange: "#F97316",
          purple: "#8B5CF6",
        },
        darkbg: {
          DEFAULT: "#0F172A",
          card: "#1E293B",
        },
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
        shimmer: {
          "0%": { "background-position": "200% 0" },
          "100%": { "background-position": "-200% 0" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-5px)" },
        },
        meteor: {
          "0%": { 
            transform: "rotate(215deg) translateY(0) translateX(0)",
            opacity: "1",
          },
          "70%": {
            opacity: "1",
          },
          "100%": { 
            transform: "rotate(215deg) translateY(200vh) translateX(200vw)",
            opacity: "0",
          },
        },
        "hexagon-pulse": {
          "0%, 100%": { opacity: "0.1" },
          "50%": { opacity: "0.3" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        shimmer: "shimmer 8s linear infinite",
        float: "float 3s ease-in-out infinite",
        meteor: "meteor linear",
        "hexagon-pulse": "hexagon-pulse 10s ease-in-out infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}

