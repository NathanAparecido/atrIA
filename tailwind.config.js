/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'primary': {
          DEFAULT: '#1e3a5f',
          '50': '#f0f4f8',
          '100': '#dce6f0',
          '200': '#b9cde1',
          '300': '#8aabcf',
          '400': '#5d87ba',
          '500': '#3d69a3',
          '600': '#2f5387',
          '700': '#28446f',
          '800': '#24385d',
          '900': '#1e3a5f',
          '950': '#142740',
        },
        'accent': {
          neon: '#00f5d4',
          corporate: '#3d69a3',
        },
        'background': {
          dark: '#0b121e',
          light: '#f0f4f8',
        },
        'surface': {
          dark: '#1e3a5f',
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
