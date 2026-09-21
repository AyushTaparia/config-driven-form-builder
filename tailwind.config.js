/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: '#1b2430',
        muted: '#5b6675',
        border: '#d5dbe3',
        surface: '#ffffff',
        accent: {
          DEFAULT: '#0b6e6e',
          soft: '#e0f0ef',
          hover: '#095959',
        },
        danger: {
          DEFAULT: '#b3261e',
          soft: '#fdecea',
          text: '#7a1a15',
        },
        warn: {
          soft: '#fff3dc',
          text: '#6b4a00',
        },
        ok: {
          soft: '#e4f4e8',
          text: '#1d4d2b',
        },
        page: '#edf0f3',
        input: '#b9c2cd',
        canvas: '#f7f9fb',
        canvasDot: '#cfd6de',
      },
      borderRadius: {
        DEFAULT: '8px',
      },
    },
  },
  plugins: [],
}
