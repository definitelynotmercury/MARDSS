/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        Fraunces: ['Fraunces', 'serif'],
      },
      colors: {
        brand: {
          navy: '#0B2E52',
          blue: '#1967B8',
          amber: '#E8B324',
          ink: '#1F2937',
        },
      },
    },
  },
  plugins: [],
}
