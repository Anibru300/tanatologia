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
          darker: '#4C5845',
        },
        secondary: {
          DEFAULT: '#7A9AA8',
          dark: '#4E6A77',
          darker: '#3F5661',
        },
        accent: {
          DEFAULT: '#C9A28E',
          dark: '#8F6B56',
          darker: '#755845',
        },
        bg: '#F7F5F2',
        'bg-alt': '#EDE8E1',
        peace: '#E8E4DE',
        surface: '#FFFFFF',
        text: {
          DEFAULT: '#3D3A36',
          light: '#6E6963',
        },
        muted: '#7A746C',
        border: '#E0DAD2',
        success: {
          DEFAULT: '#7A9E7E',
          dark: '#4A7351',
          darker: '#3B5C40',
        },
        warning: {
          DEFAULT: '#D4A373',
          dark: '#8A5A24',
          darker: '#6E481C',
        },
        error: {
          DEFAULT: '#C1666B',
          dark: '#A34D53',
          darker: '#853E43',
        },
      },
      fontFamily: {
        sans: ['Poppins', 'system-ui', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      borderRadius: {
        'xs': '8px',
        'sm': '12px',
        'md': '16px',
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
