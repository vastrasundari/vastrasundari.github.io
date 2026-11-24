/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./admin/**/*.{html,js}", "./assets/js/**/*.js"],
  theme: {
    extend: {
      colors: {
        burgundy: "#641B32",
        maroon: "#8B263D",
        gold: { DEFAULT: "#C5A04A", soft: "#DCC48A" },
        ivory: "#FAF7F0",
        charcoal: "#252323",
      },
      fontFamily: {
        display: ['"Playfair Display"', "Georgia", "serif"],
        sans: ["Poppins", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
