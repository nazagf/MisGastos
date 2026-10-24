module.exports = {
  content: ['./Gastos/templates/**/*.html', './Gastos/static/Gastos/js/*.js'],
  theme: {
    extend: {
      colors: {
        primary: '#171310', 'primary-light': '#3a332b', accent: '#a9781f',
        gold: '#a9781f', 'gold-soft': '#c99a3c', background: '#faf7f1',
        surface: '#ffffff', 'surface-alt': '#f3ede2', border: '#e7ded0',
        text: { main: '#171310', muted: '#7c7365' },
        success: '#3f7a57', warning: '#bd7a2a', danger: '#b23a2e'
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'], display: ['Space Grotesk', 'sans-serif'],
        mono: ['Space Grotesk', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace']
      }
    }
  },
  plugins: []
};
