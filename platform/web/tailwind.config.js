/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#8BAE7A',
          dark: '#5F6F55',
        },
        secondary: {
          DEFAULT: '#7A9AA8',
          dark: '#5F7D8A',
        },
        accent: {
          DEFAULT: '#C9A28E',
          dark: '#A6826E',
        },
        bg: '#F7F5F2',
        'bg-alt': '#EDE8E1',
        peace: '#E8E4DE',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#3D3A36',
          light: '#6E6963',
        },
        muted: '#A8A29A',
        border: '#E0DAD2',
        success: '#7A9E7E',
        warning: '#D4A373',
        error: '#C1666B',
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'sm': '12px',
        DEFAULT: '20px',
        'lg': '28px',
        'xl': '40px',
      },
      boxShadow: {
        'sm': '0 2px 8px rgba(61, 58, 54, 0.04)',
        DEFAULT: '0 8px 30px rgba(61, 58, 54, 0.06)',
        'lg': '0 16px 50px rgba(61, 58, 54, 0.08)',
      },
    },
  },
  plugins: [],
}
