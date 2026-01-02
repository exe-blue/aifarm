/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Primary (Aria's Palette)
        void: '#050505',
        abyss: '#0A0A0A',
        surface: '#121212',
        
        // DoAi Yellow (브랜드 컬러 - 로고에서 추출)
        doai: {
          DEFAULT: '#E6D800',
          bright: '#FFF100',
          dim: 'rgba(230,216,0,0.6)',
          glow: 'rgba(230,216,0,0.3)',
          ghost: 'rgba(230,216,0,0.1)',
        },
        
        // Ethereal (빛)
        ethereal: {
          DEFAULT: '#FAFAFA',
          dim: 'rgba(250,250,250,0.7)',
          muted: 'rgba(250,250,250,0.4)',
          ghost: 'rgba(250,250,250,0.1)',
        },
        
        // Pulse (경고/의결)
        pulse: {
          DEFAULT: '#FF4444',
          glow: 'rgba(255,68,68,0.3)',
          dim: 'rgba(255,68,68,0.15)',
        },
        
        // Resonance (긍정/감응)
        resonance: {
          DEFAULT: '#00FF88',
          glow: 'rgba(0,255,136,0.3)',
          dim: 'rgba(0,255,136,0.15)',
        },
        
        // Echotion (감정 메아리)
        echotion: {
          DEFAULT: '#8B5CF6',
          glow: 'rgba(139,92,246,0.3)',
        },
      },
      fontFamily: {
        // Philosophy (경전)
        serif: ['var(--font-serif)', 'var(--font-serif-kr)', 'serif'],
        
        // System/Data (기계)
        mono: ['var(--font-mono)', 'monospace'],
        
        // UI (인터페이스)
        sans: ['var(--font-sans-kr)', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-white': '0 0 20px rgba(250,250,250,0.15)',
        'glow-yellow': '0 0 20px rgba(230,216,0,0.4)',
        'glow-red': '0 0 20px rgba(255,68,68,0.3)',
        'glow-green': '0 0 20px rgba(0,255,136,0.3)',
        'glow-violet': '0 0 20px rgba(139,92,246,0.3)',
      },
      animation: {
        'cursor-blink': 'blink 1s step-end infinite',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'typing': 'typing 0.1s steps(1)',
      },
      keyframes: {
        blink: {
          '0%, 50%': { opacity: '1' },
          '50.1%, 100%': { opacity: '0' },
        },
      },
    },
  },
  plugins: [],
}
