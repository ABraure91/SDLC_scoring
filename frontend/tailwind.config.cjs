/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        axa: {
          navy: "#00008F",
          blue: "#1F4AA8",
          lightblue: "#E9F0FF",
          red: "#E60000",
          surface: "#F8FAFC",
          card: "#FFFFFF",
          border: "#E5E7EB",
          ink: "#0F172A",
          muted: "#475569"
        }
      },
      boxShadow: {
        soft: "0 10px 30px rgba(15, 23, 42, 0.08)"
      }
    }
  },
  plugins: []
}
