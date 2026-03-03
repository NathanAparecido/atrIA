/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#0f172a', // deep navy
          '50': '#f8fafc',
          '100': '#f1f5f9',
          '200': '#e2e8f0',
          '300': '#cbd5e1',
          '400': '#94a3b8',
          '500': '#64748b',
          '600': '#475569',
          '700': '#334155',
          '800': '#1e293b',
          '900': '#0f172a',
          '950': '#020617',
        },
        'accent': {
          blue: '#3b82f6',
          slate: '#475569',
          gray: '#94a3b8',
        },
        'background': {
          dark: '#020617', // midnight
          light: '#f8fafc', // ghost white
        },
        'surface': {
          dark: '#0f172a',
          light: '#ffffff',
        }
      },
      fontFamily: {
        'orbitron': ['Orbitron', 'sans-serif'],
        'jetbrains': ['"JetBrains Mono"', 'monospace'],
        'inter': ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
