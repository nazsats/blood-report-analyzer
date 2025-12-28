// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx,mdx}",
      "./components/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
      extend: {
        colors: {
          // If you're using oklab/oklch in custom colors, remove or convert them to rgb/hex
        },
      },
    },
    corePlugins: {
      // Optional: Disable utilities that might trigger this
      preflight: true,
    },
    // Add this to prevent Tailwind from parsing unsupported functions
    experimental: {
      optimizeUniversalDefaults: false,
    },
    // If you have plugins using oklab, add them here
    plugins: [],
  };