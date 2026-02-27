# Arcomage Art Style Guide

This document defines the visual aesthetic and technical design constraints for all UI elements, assets, and animations in the Arcomage web application.

## Overall Aesthetic: Stylized Cel-shaded Fantasy (Modern Indie)
The primary visual style is vibrant, accessible, clean, and slightly cartoonish. It merges the readability of modern mobile games (e.g., Hearthstone) with high-contrast, stylized fantasy illustrations.

### Key Principles:
1.  **Readability Above All:** Elements should pop off the background. UI must be legible on small screens.
2.  **Tangible Magic:** UI panels should feel like physical objects placed on a table, but the effects and interactions should feel inherently magical.
3.  **No Gritty Realism:** Avoid excessive texture details (like photorealistic wood grain or true grime). Use bold shadows, thick outlines, and flat, vibrant color blocking.

---

## 1. UI Materials and Shapes

*   **Primary Material:** Chunky, stylized wood. Panels, borders, and main HUD elements should appear as thick, carved wooden planks.
*   **Accents:** Iron bands, oversized rivets, and glowing gems.
*   **Shape Language:** Friendly and approachable. Use **chunky, rounded corners** on primary containers and buttons. Avoid aggressive, sharp edges.
*   **Depth:** Use distinct drop shadows beneath UI layers to give the illusion of stacked physical objects hovering slightly above the board.

## 2. Color Palette & Lighting

*   **Environment Vibe:** Warm and inviting. The background board should evoke a sunlit wooden tavern table or a brightly lit alchemist's desk.
*   **Resource Colors:** The three main resources must be saturated, distinct, and easily identifiable at a glance.
    *   **Bricks (Red):** Warm Crimson / Terracotta.
    *   **Gems (Blue):** Bright Sapphire / Cyan.
    *   **Beasts (Green):** Vibrant Emerald / Leaf Green.

## 3. Card Anatomy

*   **Format:** "Framed" cards (traditional TCG style).
*   **Structure:**
    *   **Border:** A thick, stylized border (e.g., rolled parchment or carved wood) framing the entire card.
    *   **Art Window:** A square or slightly rectangular window in the top half containing the stylized illustration.
    *   **Text Box:** Placed in the bottom half beneath the art. Text should be high-contrast (e.g., dark brown text on light cream parchment).
*   **Card Back:** Designed modularly so it can be swapped. The default back should be a stylized magical swirl, a wax seal, or a simple elemental crest.

## 4. Animation and "Feel"

*   **Transition Style:** "Flowing water or magic."
*   **Physics:** Smooth, fluid, and continuous. Avoid snappy, spring-loaded bounce physics.
*   **Examples:**
    *   When drawing a card, it should glide smoothly into the hand.
    *   Resource generation should "flow" into the counters rather than ticking up abruptly.
    *   When a tower takes damage, the module should dissolve or crumble fluidly rather than snapping away.
*   **Hover States:** Cards and buttons should elevate smoothly and gain a subtle inner or outer glow (magical aura) when hovered.

---

## Technical Asset Generation Rules (for AI/Artists)

When generating new 2D assets for this project via AI prompts, adhere to the following keywords to ensure consistency:
`Stylized, cel-shaded fantasy, clean thick outlines, vibrant flat colors, chunky rounded shapes, no photorealism, Hearthstone style, warm lighting.`
