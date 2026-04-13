```markdown
# Design System Strategy: The Cinematic Dialogue

## 1. Overview & Creative North Star
**The Creative North Star: "The Editorial Concierge"**

This design system moves away from the mechanical nature of standard chatbots and leans into the world of high-end film curation. We are not building a "support bot"; we are creating a digital connoisseur. The aesthetic is inspired by premium editorial layouts—think *Cahiers du Cinéma* meets modern Swiss minimalism.

To break the "template" look, we utilize **Intentional Asymmetry**. Chat bubbles are not perfectly mirrored; the user’s input feels light and ethereal, while the system’s responses feel grounded and authoritative. We use extreme whitespace (breathe-room) to ensure that every movie recommendation feels like a featured exhibition rather than a search result.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a gallery-white foundation, punctuated by a visceral "Ruby" accent that evokes the velvet of a cinema house and the passion of the craft.

### The "No-Line" Rule
**Prohibit 1px solid borders for sectioning.** Boundaries must be defined solely through background color shifts. A `surface-container-low` (#f3f3f3) section sitting on a `surface` (#f9f9f9) background provides all the separation a sophisticated eye needs.

### Surface Hierarchy & Nesting
Treat the UI as a series of physical layers. We use "Tonal Nesting" to create depth:
*   **Base Layer:** `background` (#f9f9f9).
*   **Secondary Content Areas:** `surface-container-low` (#f3f3f3).
*   **Interactive Cards/Bubbles:** `surface-container-lowest` (#ffffff).
*   **Elevated Overlays:** `surface-bright` (#f9f9f9) with ambient blur.

### The "Glass & Gradient" Rule
To elevate the experience beyond flat design, floating elements (like the chat input bar or sticky headers) must use **Glassmorphism**. 
*   **Token:** `surface-container-lowest` at 85% opacity.
*   **Effect:** `backdrop-filter: blur(12px)`.
*   **Soul:** Use a subtle linear gradient on primary CTAs from `primary` (#8e0004) to `primary_container` (#b9090b) to give the Ruby accent a three-dimensional "glow."

---

## 3. Typography: The Inter Scale
We use **Inter** as a variable font to maintain a clean, modernist edge. The hierarchy is designed to feel like an editorial magazine.

*   **Display (lg/md):** Reserved for film titles within the chat or hero curation moments. Tighten letter-spacing (-0.02em) to create a "bold" cinematic presence.
*   **Headline (sm):** Used for the Chatbot’s "personality" moments. It should feel authoritative.
*   **Body (lg):** The primary conversational weight. It is set to `1rem` to ensure effortless readability during long curation sessions.
*   **Labels (md/sm):** Used for metadata (Year, Genre, Director). These should always use `on_surface_variant` (#5c403c) to keep the secondary info from competing with the dialogue.

---

## 4. Elevation & Depth
Depth is a feeling, not a drop-shadow.

*   **The Layering Principle:** Avoid shadows on static elements. Achieve separation by placing a `surface-container-lowest` card on a `surface-container` background.
*   **Ambient Shadows:** For floating elements (Modals, Hovered Movie Posters), use a "Cinematic Shadow":
    *   `box-shadow: 0 12px 32px -4px rgba(142, 0, 4, 0.06);` (A tinted shadow using the primary red hue at extreme low opacity).
*   **The "Ghost Border" Fallback:** If a border is required for accessibility, use the `outline_variant` token (#e6bdb7) at **15% opacity**. Never use a 100% opaque border.

---

## 5. Components

### Messaging Bubbles (The Core Interface)
*   **System Response:** Background `surface-container-high` (#e8e8e8), `on-surface` text. Rounded `md` (0.75rem), with the bottom-left corner set to `sm` (0.25rem) to "point" to the avatar.
*   **User Input:** Background `primary` (#8e0004), `on-primary` text. No shadows. Rounded `md`, bottom-right corner at `sm`.

### Buttons
*   **Primary:** `primary_container` (#b9090b) with a 2px "inner glow" gradient. Label `on-primary`. 
*   **Secondary:** No background. `outline` color for text. On hover, a subtle `surface-container-low` background appears.

### Movie Curation Cards
*   **Layout:** Forbid dividers. Use `xl` spacing (1.5rem) to separate the poster from the metadata.
*   **Interaction:** On hover, the card should scale slightly (1.02x) and transition from `surface-container-low` to `surface-container-lowest` with an ambient shadow.

### Interactive Chat Input
*   **Styling:** A wide, pill-shaped (`full` roundness) container using the Glassmorphism rule. 
*   **Placeholder:** `on_surface_variant` text. 
*   **Action:** The "Send" button is a perfect circle of `primary` ruby, floating within the input field.

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts when presenting movie "stacks" (e.g., staggering posters vertically by 16px).
*   **Do** utilize `primary_fixed_dim` for subtle highlights in movie reviews.
*   **Do** prioritize vertical whitespace over horizontal lines.

### Don't
*   **Don't** use pure black (#000000) for text. Use `on_surface` (#1a1c1c) to maintain a premium, softer look.
*   **Don't** use standard "Material Design" shadows. They are too heavy for this airy, bright aesthetic.
*   **Don't** use high-contrast borders. If you think you need a border, try a 4px padding increase and a background tint shift first.

---

## 7. Spacing Scale
Maintain the "Airy" feel by strictly adhering to a 4px/8px baseline, but leaning heavily on the larger end of the spectrum:
*   **Component Internal:** `0.75rem` (md)
*   **Section Padding:** `2.25rem` (display-sm size)
*   **Chat Bubble Gap:** `0.5rem` (default) between same-speaker bubbles; `1.5rem` (xl) between speaker shifts.```