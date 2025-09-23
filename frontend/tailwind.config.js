/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    darkMode: 'class',
    theme: {
        extend: {
            colors: {
                'yugioh-blue': '#003f7f',
                'yugioh-gold': '#d4af37',
                'card-bg': '#f8f9fa',
            },
            fontFamily: {
                'sans': ['Inter', 'system-ui', 'sans-serif'],
            },
            gridTemplateColumns: {
                'card-grid': 'repeat(auto-fill, minmax(200px, 1fr))',
                '15': 'repeat(15, minmax(0, 1fr))',
                '18': 'repeat(18, minmax(0, 1fr))',
                '20': 'repeat(20, minmax(0, 1fr))',
            },
            cursor: {
                'yugioh': 'url("./src/assets/yugioh-cursor-32.png"), auto',
                'yugioh-pointer': 'url("./src/assets/yugioh-cursor-32.png"), pointer',
            }
        },
    },
    plugins: [],
}
