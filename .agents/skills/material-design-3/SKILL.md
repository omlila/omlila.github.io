---
name: material-design-3
description: >-
  Use this skill when the user asks to implement or apply Google Material Design 3 (MD3) guidelines, components, or styling in the UI.
---

# Material Design 3 Skill

This skill guides the agent in applying Google Material Design 3 (MD3) principles to web applications.

## Core Principles

1.  **Color System (Dynamic Color)**: MD3 relies heavily on dynamic color. Create a color palette that includes Primary, Secondary, Tertiary, Surface, and Error colors, along with their respective "On" (text/icon) colors and Container variants.
2.  **Typography**: Use modern, readable fonts (e.g., Roboto, Inter, or System Fonts). Adhere to MD3 typography scales (Display, Headline, Title, Label, Body) with specific sizes, weights, and tracking.
3.  **Elevation & Shadow**: MD3 uses tonal elevation (surface color shifts) in addition to shadow elevation. Use distinct levels of elevation (Level 0 to 5) to indicate hierarchy and focus.
4.  **Shape**: Apply rounded corners consistently. Common values are 4px (extra small), 8px (small), 12px (medium), 16px (large), 28px (extra large), and fully rounded (pill shapes).
5.  **Components**: Follow MD3 structural guidelines for components like Buttons (Filled, Tonal, Outlined, Text), FABs, Cards (Elevated, Filled, Outlined), Navigation Bars, and Dialogs.

## Implementation Guidelines

*   **CSS / Tailwind**: Implement MD3 tokens using CSS variables or Tailwind configuration (e.g., configuring `colors.md.primary`, `borderRadius.md.medium`).
*   **Aesthetics**: Prioritize clear visual hierarchy, accessible color contrast, and spacious layouts.
*   **Interactions**: Include subtle micro-animations for hover, focus, and active states. Use a ripple effect or simple background-color shifts for interactive elements.

## Steps to Apply

1.  **Define Tokens**: Ensure the project's CSS/theme has MD3 tokens defined.
2.  **Update Components**: Refactor existing components to match MD3 shapes, spacing, and colors.
3.  **Review Accessibility**: Verify contrast ratios using DevTools or web guidelines.
