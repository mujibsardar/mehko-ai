/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html","./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#10b981",
          50:"#ecfdf5",100:"#d1fae5",200:"#a7f3d0",300:"#6ee7b7",
          400:"#34d399",500:"#10b981",600:"#059669",700:"#047857",
          800:"#065f46",900:"#064e3b"
        }
      },
      borderRadius: { lg:"14px", xl:"18px", "2xl":"24px" },
      boxShadow: {
        card: "0 6px 24px rgba(0,0,0,0.06)",
        hover: "0 10px 28px rgba(0,0,0,0.10)"
      }
    }
  },
  plugins: [require("tailwindcss-animate")],
};
