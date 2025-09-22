/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
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
            }
        },
    },
    plugins: [],
}
