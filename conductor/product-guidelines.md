# Product Guidelines

## 1. Design & UX Principles
- **Aesthetic Excellence:** Ensure the application embraces a premium, modern design language (e.g., glassmorphism, fluid animations) per the project's styling directives.
- **Accessibility First:** Guarantee 48px minimum touch targets and robust contrast ratios. Form inputs must properly use `aria-label` and `htmlFor` attributes.
- **Responsive Fluidity:** The studio interface must scale gracefully across diverse screen sizes, utilizing `max-w-screen-2xl` boundaries on desktop while remaining usable on mobile.

## 2. Branding & Tone
- **Culturally Nuanced:** Emphasize the richness of Nepali poetry by ensuring the generated lyrics and the studio's presentation are culturally respectful and authentic.
- **Professional & Empowering:** The application tone should be encouraging for creators, focusing on ease-of-use and professional-grade outputs (4K, accurate sync).

## 3. Engineering Guidelines
- **Performance:** Keep the Canvas renderer highly optimized. Aim for a consistent 60fps frame rate during Live Preview. Avoid unnecessary re-renders in React.
- **Code Consistency:** Rely on defined Tailwind design tokens and standardized React UI patterns rather than fragmented utility styles (e.g., standardizing `p-8 rounded-[2rem]` for main panels).
