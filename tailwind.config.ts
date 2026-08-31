import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0f7ff",
          100: "#e0efff",
          500: "#0071e3",
          600: "#0066cc",
          700: "#0058b0"
        }
      },
      boxShadow: {
        soft: "0 1px 2px rgba(0,0,0,.025), 0 8px 24px rgba(0,0,0,.035)",
        floating: "0 18px 50px rgba(0,0,0,.16), 0 2px 8px rgba(0,0,0,.08)"
      },
      transitionTimingFunction: {
        "apple-out": "cubic-bezier(.2,.8,.2,1)"
      }
    }
  },
  plugins: []
};

export default config;
