/** @type {import('tailwindcss').Config} */
module.exports = {
    darkMode: ["class"],
    content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
  	extend: {
  		colors: {
  			background: 'hsl(var(--background))',
  			foreground: 'hsl(var(--foreground))',
  			fieldMain: 'hsl(var(--field-background-main))',
  			fieldHand: 'hsl(var(--field-background-hand))',
  			fieldSecondary: 'hsl(var(--field-background-secondary))',
  			btn: {
  				background: 'hsl(var(--btn-background))',
  				'background-hover': 'hsl(var(--btn-background-hover))'
  			},
  			overlay: 'hsl(var(--overlay-background))'
  		},
  		borderRadius: {
  			lg: 'var(--radius)',
  			md: 'calc(var(--radius) - 2px)',
  			sm: 'calc(var(--radius) - 4px)'
  		}
  	}
  },
  plugins: [require("tailwindcss-animate")],
};
