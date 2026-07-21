/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        accent: '#ef8354',
        note: {
          yellow: { light: '#fef9c3', dark: '#854d0e' },
          blue: { light: '#dbeafe', dark: '#1e40af' },
          green: { light: '#dcfce7', dark: '#166534' },
          red: { light: '#fee2e2', dark: '#991b1b' },
          purple: { light: '#f3e8ff', dark: '#6b21a8' },
          orange: { light: '#ffedd5', dark: '#9a3412' },
          pink: { light: '#fce7f3', dark: '#9d174d' },
          gray: { light: '#f3f4f6', dark: '#374151' },
        },
      },
    },
  },
  safelist: [
    { pattern: /^bg-note-(yellow|blue|green|red|purple|orange|pink|gray)-(light|dark)$/ },
  ],
  plugins: [],
};
