/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: {
          DEFAULT: 'var(--bg-primary)',
          secondary: 'var(--bg-secondary)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
        },
        primary: {
          DEFAULT: 'var(--purple-primary)',
          secondary: 'var(--purple-secondary)',
        },
        accent: {
          DEFAULT: 'var(--accent-primary)',
          secondary: 'var(--accent-secondary)',
        },
        border: {
          DEFAULT: 'var(--border-color)',
          glow: 'var(--border-glow)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          muted: 'var(--text-muted)',
        },
        semantic: {
          success: 'var(--color-success)',
          warning: 'var(--color-warning)',
          danger: 'var(--color-danger)',
          info: 'var(--color-info)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        space: ['Space Grotesk', 'sans-serif'],
      },
      spacing: {
        'density-padding': 'var(--density-padding)',
        'density-gap': 'var(--density-gap)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        card: 'var(--card-radius)',
      },
      boxShadow: {
        elevation1: 'var(--elevation-1)',
        elevation2: 'var(--elevation-2)',
        elevation3: 'var(--elevation-3)',
        glow: 'var(--accent-glow)',
      },
      transitionDuration: {
        fast: 'var(--transition-fast)',
        normal: 'var(--transition-normal)',
        slow: 'var(--transition-slow)',
      },
    },
  },
  plugins: [],
};
