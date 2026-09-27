import type { Config } from 'tailwindcss'
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        sea: '#0c4a6e',
        primary: { DEFAULT: '#1a56db', dark: '#1e429f' },
        whatsapp: '#25D366',
      },
    },
  },
  plugins: [],
}
export default config
