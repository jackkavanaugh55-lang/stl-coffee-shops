/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["DM Sans", "sans-serif"],
        serif: ["Lora", "Georgia", "serif"],
      },
      colors: {
        primary: {
          DEFAULT: "#6F4E37",
          foreground: "#FFF8F0",
        },
        secondary: {
          DEFAULT: "#F5EFE6",
          foreground: "#2D241E",
        },
        background: "#FDFAF7",
        foreground: "#2D241E",
        card: {
          DEFAULT: "#FFFFFF",
          foreground: "#2D241E",
        },
        muted: {
          DEFAULT: "#F5EFE6",
          foreground: "#8A7B71",
        },
        border: "#E8DDD5",
      },
    },
  },
  plugins: [],
};
