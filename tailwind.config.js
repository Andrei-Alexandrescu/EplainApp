export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        pop: '0 8px 32px -4px rgba(15, 23, 42, 0.12), 0 4px 16px -4px rgba(15, 23, 42, 0.08)',
        float: '0 24px 64px -12px rgba(15, 23, 42, 0.22), 0 12px 24px -8px rgba(15, 23, 42, 0.1)',
      },
    },
  },
  plugins: [],
}
