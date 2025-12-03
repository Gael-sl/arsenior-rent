/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{html,ts}",
  ],
  theme: {
    extend: {
      fontFamily: {
        'playfair': ['"Playfair Display"', 'serif'],
        'sans': ['system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        'arsenal-black': '#000000',
        'arsenal-gray': '#666666',
        'arsenal-light': '#F5F5F5',
      },
    },
  },
  plugins: [],
}